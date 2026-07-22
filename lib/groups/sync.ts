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
  expandBots,
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
 * Reconcile a topic's accounts toward its new bot count, at most `chunkSize`
 * operations per call (1 `getUsers` + ≤`chunkSize` delete/create subrequests),
 * so a big change stays under the Workers 50-subrequest limit. Deletes the
 * accounts no longer expected and creates the newly added ones; crossing the
 * 1↔N boundary renames the bare account (Drasl can't rename in place, so the old
 * user is recreated — fine for derived bot accounts). The caller passes the old
 * topic (so the removed name set stays derivable) and loops until remaining 0.
 */
export async function syncUpdateTopicBotCountChunk(
  oldTopic: Topic,
  newTopic: Topic,
  groups: Group[],
  managed: Set<string>,
  chunkSize: number,
): Promise<ChunkResult> {
  const oldNames = new Set(expectedUsernamesForTopic(oldTopic, groups));
  const newAccounts = await accountsForTopic(groups, newTopic);
  const newNames = new Set(newAccounts.map((a) => a.username));
  // Delete owned old names that are no longer wanted; create wanted names we
  // don't own yet. The two sets are disjoint (a name can't be both).
  const remainingOps = () =>
    [...oldNames].filter((n) => !newNames.has(n) && managed.has(n)).length +
    newAccounts.filter((a) => !managed.has(a.username)).length;

  const before = remainingOps();
  const r = emptyResult();
  if (before === 0) return { result: r, total: before, before, remaining: 0 };

  const map = await usernameMap();
  const toDelete = [...oldNames].filter((n) => !newNames.has(n) && managed.has(n));
  const delNow = toDelete.slice(0, chunkSize);
  await runPool(delNow, SYNC_CONCURRENCY, (n) => deleteIfPresent(n, map, r, managed));
  const createBudget = chunkSize - delNow.length;
  if (createBudget > 0) {
    const toCreate = newAccounts.filter((a) => !managed.has(a.username)).slice(0, createBudget);
    await runPool(toCreate, SYNC_CONCURRENCY, (a) =>
      createIfAbsent(a.username, a.password, map, r, managed, !newTopic.open),
    );
  }
  return { result: r, total: before, before, remaining: remainingOps() };
}

/**
 * Lock (close) or unlock (open) up to `chunkSize` of a topic's accounts that
 * aren't already at the target state, per call (1 `getUsers` + ≤`chunkSize`
 * `updateUser` subrequests), so toggling a big topic stays under the Workers
 * 50-subrequest limit. Each call refetches state and only touches accounts still
 * mismatched, so it's naturally idempotent; the caller loops until remaining 0.
 */
export async function syncSetTopicLockChunk(
  topic: Topic,
  groups: Group[],
  locked: boolean,
  managed: Set<string>,
  chunkSize: number,
): Promise<ChunkResult> {
  const names = expectedUsernamesForTopic(topic, groups);
  const map = await usernameMap();
  // Ours, exists, and not already at the target lock state.
  const todo = names.filter((n) => {
    if (!managed.has(n)) return false;
    const u = map.get(n);
    return u !== undefined && u.isLocked !== locked;
  });
  const before = todo.length;
  const r = emptyResult();
  if (before === 0) return { result: r, total: names.length, before, remaining: 0 };
  await runPool(todo.slice(0, chunkSize), SYNC_CONCURRENCY, (n) => setLock(n, locked, map, r, managed));
  // `map` is a snapshot (not refreshed after updates); remaining = still-needed
  // minus this call's successes. The next call recomputes from fresh state.
  const remaining = before - r.updated;
  return { result: r, total: names.length, before, remaining };
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
export async function syncCreateGroupChunk(
  group: Group,
  topics: Topic[],
  managed: Set<string>,
  chunkSize: number,
): Promise<ChunkResult> {
  // Flatten across topics, carrying each topic's locked state per account.
  const plan = (
    await Promise.all(
      topics.map(async (t) =>
        (await accountsForTopicInGroup(group, t)).map((a) => ({ ...a, locked: !t.open })),
      ),
    )
  ).flat();
  const total = plan.length;
  const todo = plan.filter((a) => !managed.has(a.username));
  const before = todo.length;
  const r = emptyResult();
  if (before === 0) return { result: r, total, before, remaining: 0 };
  const map = await usernameMap();
  await runPool(todo.slice(0, chunkSize), SYNC_CONCURRENCY, (a) =>
    createIfAbsent(a.username, a.password, map, r, managed, a.locked),
  );
  const remaining = plan.filter((a) => !managed.has(a.username)).length;
  return { result: r, total, before, remaining };
}

/**
 * Delete up to `chunkSize` of the given usernames that are ours, per call (1
 * `getUsers` + ≤`chunkSize` `deleteUser` subrequests), so removing a big topic
 * stays under the Workers 50-subrequest limit. The caller loops until remaining
 * 0. `total` is the full name count; `remaining` counts names still owned.
 */
export async function syncDeleteUsernamesChunk(
  usernames: string[],
  managed: Set<string>,
  chunkSize: number,
): Promise<ChunkResult> {
  const todo = usernames.filter((n) => managed.has(n));
  const before = todo.length;
  const r = emptyResult();
  if (before === 0) return { result: r, total: usernames.length, before, remaining: 0 };
  const map = await usernameMap();
  await runPool(todo.slice(0, chunkSize), SYNC_CONCURRENCY, (n) => deleteIfPresent(n, map, r, managed));
  const remaining = usernames.filter((n) => managed.has(n)).length;
  return { result: r, total: usernames.length, before, remaining };
}

/**
 * Cascade a group renumber (oldNumber -> group.number), `chunkSize` ops per call.
 * Group-topic usernames change → delete old + create new (detectable via the
 * registry). Personal-topic usernames don't change, only the password does (an
 * in-place PATCH that isn't detectable), so this is offset-based: the caller
 * passes how many ops are done and loops until `done`. `renamesRemaining` lets
 * the caller gate persistence on the (detectable, destructive) group renames.
 */
export interface RenumberChunkResult {
  result: SyncResult;
  total: number;
  offset: number; // ops processed so far (new offset)
  done: boolean;
  renamesRemaining: number; // group-topic renames not yet applied
}

export async function syncRenumberGroupChunk(
  oldNumber: string,
  group: Group,
  topics: Topic[],
  managed: Set<string>,
  offset: number,
  chunkSize: number,
): Promise<RenumberChunkResult> {
  type Op =
    | { kind: "delete"; username: string }
    | { kind: "create"; username: string; password: string; locked: boolean }
    | { kind: "password"; username: string; password: string };
  const ops: Op[] = [];
  const groupTopics = topics.filter((t) => t.type === "group");
  // Stable order: delete old group accounts, create new ones, then re-password
  // personal accounts. Delete/create names are disjoint, so a concurrent chunk
  // never races the same name.
  for (const t of groupTopics) {
    for (const name of expandBots(groupUsername(oldNumber, t.code), t.botCount)) {
      ops.push({ kind: "delete", username: name });
    }
  }
  for (const t of groupTopics) {
    const password = await groupPassword(group.number);
    for (const name of expandBots(groupUsername(group.number, t.code), t.botCount)) {
      ops.push({ kind: "create", username: name, password, locked: !t.open });
    }
  }
  for (const t of topics) {
    if (t.type !== "personal") continue;
    for (const m of group.members) {
      const password = await personalPassword(group.number, m);
      for (const username of expandBots(personalUsername(m, t.code), t.botCount)) {
        ops.push({ kind: "password", username, password });
      }
    }
  }

  const total = ops.length;
  const r = emptyResult();
  const slice = ops.slice(offset, offset + chunkSize);
  if (slice.length > 0) {
    const map = await usernameMap();
    await runPool(slice, SYNC_CONCURRENCY, (op) => {
      if (op.kind === "delete") return deleteIfPresent(op.username, map, r, managed);
      if (op.kind === "create")
        return createIfAbsent(op.username, op.password, map, r, managed, op.locked);
      return setPassword(op.username, op.password, map, r, managed);
    });
  }
  const newOffset = offset + slice.length;
  const oldNames = groupTopics.flatMap((t) => expandBots(groupUsername(oldNumber, t.code), t.botCount));
  const newNames = groupTopics.flatMap((t) => expandBots(groupUsername(group.number, t.code), t.botCount));
  const renamesRemaining =
    oldNames.filter((n) => managed.has(n)).length + newNames.filter((n) => !managed.has(n)).length;
  return { result: r, total, offset: newOffset, done: newOffset >= total, renamesRemaining };
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
export async function syncUpdateMembersChunk(
  group: Group,
  addedMembers: string[],
  removedMembers: string[],
  personalTopics: Topic[],
  managed: Set<string>,
  chunkSize: number,
): Promise<ChunkResult> {
  // expandBots so botCount>1 personal topics get every suffixed account.
  const delNames = personalTopics.flatMap((t) =>
    removedMembers.flatMap((m) => expandBots(personalUsername(m, t.code), t.botCount)),
  );
  const createAccounts = (
    await Promise.all(
      personalTopics.flatMap((t) =>
        addedMembers.map(async (m) => {
          const password = await personalPassword(group.number, m);
          return expandBots(personalUsername(m, t.code), t.botCount).map((username) => ({
            username,
            password,
            locked: !t.open,
          }));
        }),
      ),
    )
  ).flat();
  const remainingOps = () =>
    delNames.filter((n) => managed.has(n)).length +
    createAccounts.filter((a) => !managed.has(a.username)).length;

  const before = remainingOps();
  const r = emptyResult();
  if (before === 0) return { result: r, total: before, before, remaining: 0 };

  const map = await usernameMap();
  // Deletes first (added/removed member sets are disjoint, so no name reuse),
  // then creates within the leftover budget.
  const delTodo = delNames.filter((n) => managed.has(n)).slice(0, chunkSize);
  await runPool(delTodo, SYNC_CONCURRENCY, (n) => deleteIfPresent(n, map, r, managed));
  const createBudget = chunkSize - delTodo.length;
  if (createBudget > 0) {
    const createTodo = createAccounts.filter((a) => !managed.has(a.username)).slice(0, createBudget);
    await runPool(createTodo, SYNC_CONCURRENCY, (a) =>
      createIfAbsent(a.username, a.password, map, r, managed, a.locked),
    );
  }
  return { result: r, total: before, before, remaining: remainingOps() };
}
