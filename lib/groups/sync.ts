import "server-only";
import { getUsers, createUser, updateUser, deleteUser } from "@/lib/drasl/users";
import { DraslAPIError } from "@/lib/drasl/client";
import type { APIUser } from "@/lib/types";
import type { Group, Topic } from "./types";
import {
  accountsForTopicInGroup,
  personalUsername,
  personalPassword,
  groupUsername,
  groupPassword,
} from "./naming";

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
  return e instanceof DraslAPIError ? e.message : "unknown error";
}

async function usernameMap(): Promise<Map<string, APIUser>> {
  const users = await getUsers();
  return new Map(users.map((u) => [u.username, u]));
}

async function createIfAbsent(
  username: string,
  password: string,
  map: Map<string, APIUser>,
  r: SyncResult,
): Promise<void> {
  if (map.has(username)) return;
  try {
    // playerName === username creates a same-named player alongside the user.
    await createUser({ username, password, playerName: username });
    r.created++;
  } catch (e) {
    r.errors.push(`建立 ${username}: ${errMsg(e)}`);
  }
}

async function deleteIfPresent(
  username: string,
  map: Map<string, APIUser>,
  r: SyncResult,
): Promise<void> {
  const user = map.get(username);
  if (!user) return;
  try {
    await deleteUser(user.uuid);
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
): Promise<void> {
  const user = map.get(username);
  if (!user) return;
  try {
    await updateUser(user.uuid, { password });
    r.updated++;
  } catch (e) {
    r.errors.push(`改密碼 ${username}: ${errMsg(e)}`);
  }
}

/** Create every account a new topic implies across all groups. */
export async function syncCreateTopic(groups: Group[], topic: Topic): Promise<SyncResult> {
  const r = emptyResult();
  const map = await usernameMap();
  for (const g of groups) {
    for (const a of await accountsForTopicInGroup(g, topic)) {
      await createIfAbsent(a.username, a.password, map, r);
    }
  }
  return r;
}

/** Create every account a new group implies across all existing topics. */
export async function syncCreateGroup(group: Group, topics: Topic[]): Promise<SyncResult> {
  const r = emptyResult();
  const map = await usernameMap();
  for (const t of topics) {
    for (const a of await accountsForTopicInGroup(group, t)) {
      await createIfAbsent(a.username, a.password, map, r);
    }
  }
  return r;
}

/** Delete the given usernames if they exist. */
export async function syncDeleteUsernames(usernames: string[]): Promise<SyncResult> {
  const r = emptyResult();
  const map = await usernameMap();
  for (const name of usernames) await deleteIfPresent(name, map, r);
  return r;
}

/**
 * Cascade a group renumber (oldNumber -> group.number).
 * Personal-topic usernames don't contain the group number, so only their
 * password changes (in-place PATCH). Group-topic usernames do change, so the
 * old user is deleted and a new one created (username is immutable in Drasl).
 */
export async function syncRenumberGroup(
  oldNumber: string,
  group: Group,
  topics: Topic[],
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
        );
      }
    } else {
      await deleteIfPresent(groupUsername(oldNumber, t.code), map, r);
      await createIfAbsent(
        groupUsername(group.number, t.code),
        await groupPassword(group.number),
        map,
        r,
      );
    }
  }
  return r;
}

/**
 * Cascade membership changes. Added members get a user for every personal
 * topic; removed members lose theirs. Group topics are per-group and unaffected.
 * (Changing a member's number arrives here as remove-old + add-new.)
 */
export async function syncUpdateMembers(
  group: Group,
  addedMembers: string[],
  removedMembers: string[],
  personalTopics: Topic[],
): Promise<SyncResult> {
  const r = emptyResult();
  const map = await usernameMap();
  for (const t of personalTopics) {
    for (const m of addedMembers) {
      await createIfAbsent(
        personalUsername(m, t.code),
        await personalPassword(group.number, m),
        map,
        r,
      );
    }
    for (const m of removedMembers) {
      await deleteIfPresent(personalUsername(m, t.code), map, r);
    }
  }
  return r;
}
