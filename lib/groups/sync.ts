import "server-only";
import { unstable_rethrow } from "next/navigation";
import { getUsers, createUser, updateUser, deleteUser } from "@/lib/drasl/users";
import { DraslAPIError } from "@/lib/drasl/client";
import { runPool } from "@/lib/pool";
import type { APIUser } from "@/lib/types";
import type { Group, Topic } from "./types";
import {
  accountsForTopicInGroup,
  accountsForTopic,
  expectedUsernamesForTopic,
  personalUsername,
  personalPassword,
  groupUsername,
  groupPassword,
} from "./naming";

// How many Drasl account calls run at once. Sequential (=1) blew the request
// timeout at ~100 accounts; this fans them out while staying gentle on Drasl.
// 6 matches the Workers cap of 6 simultaneous outbound connections (higher just
// queues). ponytail: 6 is the knob — lower it if Drasl 429s.
const SYNC_CONCURRENCY = 6;

export interface SyncResult {
  created: number;
  deleted: number;
  updated: number;
  errors: string[];
}

function emptyResult(): SyncResult {
  return { created: 0, deleted: 0, updated: 0, errors: [] };
}

function errMsg(e: unknown): string {
  // A caught redirect()/notFound() from draslFetch must not become a string —
  // rethrow so Next handles it (401/403 → redirect to /login). Every catch here
  // funnels through errMsg, so this one guard covers them all.
  unstable_rethrow(e);
  return e instanceof DraslAPIError ? e.message : "unknown error";
}

async function usernameMap(): Promise<Map<string, APIUser>> {
  const users = await getUsers();
  return new Map(users.map((u) => [u.username, u]));
}

/**
 * `managed` is the set of usernames this system owns. Destructive helpers only
 * act on owned names; create adopts a name only when it doesn't already belong
 * to an unrelated account (otherwise it reports a collision).
 */
async function createIfAbsent(
  username: string,
  password: string,
  map: Map<string, APIUser>,
  r: SyncResult,
  managed: Set<string>,
  locked = false,
): Promise<void> {
  if (map.has(username)) {
    if (managed.has(username)) return; // already ours
    r.errors.push(`名稱衝突 ${username}（已存在且非系統建立）`);
    return;
  }
  try {
    // playerName === username creates a same-named player alongside the user.
    await createUser({ username, password, playerName: username, isLocked: locked });
    managed.add(username);
    r.created++;
  } catch (e) {
    r.errors.push(`建立 ${username}: ${errMsg(e)}`);
  }
}

async function deleteIfPresent(
  username: string,
  map: Map<string, APIUser>,
  r: SyncResult,
  managed: Set<string>,
): Promise<void> {
  if (!managed.has(username)) return; // not ours — never touch
  const user = map.get(username);
  if (!user) {
    managed.delete(username); // already gone; drop from registry
    return;
  }
  try {
    await deleteUser(user.uuid);
    managed.delete(username);
    r.deleted++;
  } catch (e) {
    r.errors.push(`刪除 ${username}: ${errMsg(e)}`);
  }
}

async function setPassword(
  username: string,
  password: string,
  map: Map<string, APIUser>,
  r: SyncResult,
  managed: Set<string>,
): Promise<void> {
  if (!managed.has(username)) return;
  const user = map.get(username);
  if (!user) return;
  try {
    await updateUser(user.uuid, { password });
    r.updated++;
  } catch (e) {
    r.errors.push(`改密碼 ${username}: ${errMsg(e)}`);
  }
}

async function setLock(
  username: string,
  locked: boolean,
  map: Map<string, APIUser>,
  r: SyncResult,
  managed: Set<string>,
): Promise<void> {
  if (!managed.has(username)) return;
  const user = map.get(username);
  if (!user || user.isLocked === locked) return;
  try {
    await updateUser(user.uuid, { isLocked: locked });
    r.updated++;
  } catch (e) {
    r.errors.push(`${locked ? "鎖定" : "解鎖"} ${username}: ${errMsg(e)}`);
  }
}

/**
 * Apply a topic's bot-count change: delete accounts no longer expected and
 * create the newly added ones (matching the topic's open/locked state).
 * Crossing the 1↔N boundary renames the bare account, which Drasl can't do in
 * place, so the old user is recreated — acceptable here since these are derived
 * bot accounts (players are recreated same-name, no OIDC, tokens are ephemeral).
 */
export async function syncUpdateTopicBotCount(
  oldTopic: Topic,
  newTopic: Topic,
  groups: Group[],
  managed: Set<string>,
): Promise<SyncResult> {
  const r = emptyResult();
  const map = await usernameMap();
  const oldNames = new Set(expectedUsernamesForTopic(oldTopic, groups));
  const newAccounts = await accountsForTopic(groups, newTopic);
  const newNames = new Set(newAccounts.map((a) => a.username));

  const toDelete = [...oldNames].filter((n) => !newNames.has(n));
  const toCreate = newAccounts.filter((a) => !oldNames.has(a.username));
  await runPool(toDelete, SYNC_CONCURRENCY, (n) => deleteIfPresent(n, map, r, managed));
  await runPool(toCreate, SYNC_CONCURRENCY, (a) =>
    createIfAbsent(a.username, a.password, map, r, managed, !newTopic.open),
  );
  return r;
}

/** Lock (close) or unlock (open) every existing account of a topic. */
export async function syncSetTopicLock(
  topic: Topic,
  groups: Group[],
  locked: boolean,
  managed: Set<string>,
): Promise<SyncResult> {
  const r = emptyResult();
  const map = await usernameMap();
  await runPool(expectedUsernamesForTopic(topic, groups), SYNC_CONCURRENCY, (username) =>
    setLock(username, locked, map, r, managed),
  );
  return r;
}

export interface ChunkResult {
  result: SyncResult;
  total: number; // accounts the topic needs in total
  before: number; // accounts still missing before this chunk ran
  remaining: number; // accounts still missing after this chunk
}

/**
 * Create up to `chunkSize` of a topic's not-yet-owned accounts. Each call makes
 * 1 `getUsers` + at most `chunkSize` `createUser` subrequests, so a large topic
 * (e.g. 69 personal accounts) can be built across several requests without
 * tripping the Cloudflare Workers 50-subrequest-per-request limit. The caller
 * loops until `remaining === 0`. Passwords are hashed locally (no subrequests).
 */
export async function syncCreateTopicChunk(
  groups: Group[],
  topic: Topic,
  managed: Set<string>,
  chunkSize: number,
): Promise<ChunkResult> {
  const accounts = await accountsForTopic(groups, topic);
  const total = accounts.length;
  const todo = accounts.filter((a) => !managed.has(a.username));
  const before = todo.length;
  const r = emptyResult();
  if (before === 0) return { result: r, total, before, remaining: 0 };
  const map = await usernameMap();
  await runPool(todo.slice(0, chunkSize), SYNC_CONCURRENCY, (a) =>
    createIfAbsent(a.username, a.password, map, r, managed, !topic.open),
  );
  const remaining = accounts.filter((a) => !managed.has(a.username)).length;
  return { result: r, total, before, remaining };
}

/** Create every account a new group implies across all existing topics. */
export async function syncCreateGroup(
  group: Group,
  topics: Topic[],
  managed: Set<string>,
): Promise<SyncResult> {
  const r = emptyResult();
  const map = await usernameMap();
  // Flatten across topics, carrying each topic's locked state per account.
  const plan = (
    await Promise.all(
      topics.map(async (t) =>
        (await accountsForTopicInGroup(group, t)).map((a) => ({ ...a, locked: !t.open })),
      ),
    )
  ).flat();
  await runPool(plan, SYNC_CONCURRENCY, (a) =>
    createIfAbsent(a.username, a.password, map, r, managed, a.locked),
  );
  return r;
}

/** Delete the given usernames if they exist and are ours. */
export async function syncDeleteUsernames(
  usernames: string[],
  managed: Set<string>,
): Promise<SyncResult> {
  const r = emptyResult();
  const map = await usernameMap();
  await runPool(usernames, SYNC_CONCURRENCY, (name) => deleteIfPresent(name, map, r, managed));
  return r;
}

/**
 * Cascade a group renumber (oldNumber -> group.number).
 * Personal-topic usernames don't contain the group number, so only their
 * password changes (in-place PATCH). Group-topic usernames do change, so the
 * old user is deleted and a new one created (username is immutable in Drasl).
 * The replacement inherits the topic's open/locked state.
 */
export async function syncRenumberGroup(
  oldNumber: string,
  group: Group,
  topics: Topic[],
  managed: Set<string>,
): Promise<SyncResult> {
  const r = emptyResult();
  const map = await usernameMap();
  for (const t of topics) {
    if (t.type === "personal") {
      for (const m of group.members) {
        await setPassword(
          personalUsername(m, t.code),
          await personalPassword(group.number, m),
          map,
          r,
          managed,
        );
      }
    } else {
      await deleteIfPresent(groupUsername(oldNumber, t.code), map, r, managed);
      await createIfAbsent(
        groupUsername(group.number, t.code),
        await groupPassword(group.number),
        map,
        r,
        managed,
        !t.open,
      );
    }
  }
  return r;
}

/**
 * Cascade membership changes. Added members get a user for every personal
 * topic; removed members lose theirs. Group topics are per-group and unaffected.
 * (Changing a member's number arrives here as remove-old + add-new.)
 *
 * Deletes run before creates so a name freed here is gone before any add.
 * ponytail: cross-request races (two admins moving the same member at once) are
 * inherent to KV's lack of CAS — move group config to D1 if that matters.
 */
export async function syncUpdateMembers(
  group: Group,
  addedMembers: string[],
  removedMembers: string[],
  personalTopics: Topic[],
  managed: Set<string>,
): Promise<SyncResult> {
  const r = emptyResult();
  const map = await usernameMap();
  const toDelete = personalTopics.flatMap((t) =>
    removedMembers.map((m) => personalUsername(m, t.code)),
  );
  const toCreate = await Promise.all(
    personalTopics.flatMap((t) =>
      addedMembers.map(async (m) => ({
        username: personalUsername(m, t.code),
        password: await personalPassword(group.number, m),
        locked: !t.open,
      })),
    ),
  );
  // Deletes must fully finish before any create, so a freed name is gone first.
  await runPool(toDelete, SYNC_CONCURRENCY, (name) => deleteIfPresent(name, map, r, managed));
  await runPool(toCreate, SYNC_CONCURRENCY, (a) =>
    createIfAbsent(a.username, a.password, map, r, managed, a.locked),
  );
  return r;
}
