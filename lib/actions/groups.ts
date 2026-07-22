"use server";

import { updateTag } from "next/cache";
import { readConfig, writeConfig } from "@/lib/groups/store";
import { requireAdmin } from "@/lib/groups/guard";
import {
  syncCreateGroupChunk,
  syncDeleteUsernamesChunk,
  syncRenumberGroupChunk,
  syncUpdateMembersChunk,
  type SyncResult,
} from "@/lib/groups/sync";
import { expectedUsernamesForGroup, loadManaged } from "@/lib/groups/naming";
import type { Group } from "@/lib/groups/types";

const NUM = /^\d+$/;

// Account operations per chunked call. Worst case ~43 subrequests (1 getUsers +
// <=40 create/delete/update + KV read + KV write), under the Cloudflare Workers
// 50-subrequest cap (the client loops).
const CHUNK = 40;

export interface GroupActionResult {
  success: boolean;
  error?: string;
  sync?: SyncResult;
  done?: boolean; // the whole operation is complete
  created?: number; // accounts created in THIS call
  deleted?: number; // accounts deleted in THIS call
  updated?: number; // accounts updated in THIS call
  total?: number; // operation size (denominator for progress)
  remaining?: number; // work still left after this call (state-based ops)
  offset?: number; // ops processed so far (renumber's offset-based loop)
}

function fail(error: string): GroupActionResult {
  return { success: false, error };
}

/** Summary message when some account operations failed (for destructive ops). */
function syncFailure(sync: SyncResult): string {
  return `部分帳號操作失敗（${sync.errors.length}）`;
}

/** Same member set, ignoring order — used to tell resume from a real conflict. */
function sameMembers(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((m) => set.has(m));
}

export async function createGroupAction(
  rawNumber: string,
  rawMembers: string[],
): Promise<GroupActionResult> {
  const denied = await requireAdmin();
  if (denied) return fail(denied);

  const number = rawNumber.trim();
  const members = rawMembers.map((m) => m.trim()).filter(Boolean);
  if (!NUM.test(number)) return fail("組別編號必須為數字");
  if (members.some((m) => !NUM.test(m))) return fail("組員編號必須為數字");
  if (new Set(members).size !== members.length) return fail("組員編號重複");

  const config = await readConfig();
  const existing = config.groups.find((g) => g.number === number);
  // Same number, same members → resume a partial build (client loops). Same
  // number, different members → a real conflict.
  if (existing && !sameMembers(existing.members, members)) return fail(`組別 ${number} 已存在`);
  if (!existing) {
    const taken = new Set(config.groups.flatMap((g) => g.members));
    const dup = members.find((m) => taken.has(m));
    if (dup) return fail(`組員編號 ${dup} 已屬於其他組別`);
  }
  const group: Group = existing ?? { number, members };
  const managed = loadManaged(config);

  const { result: sync, total, before, remaining } = await syncCreateGroupChunk(
    group,
    config.topics,
    managed,
    CHUNK,
  );
  if (existing && before === 0) return fail(`組別 ${number} 已存在`);
  updateTag("users");

  const done = remaining === 0 && sync.errors.length === 0;
  // Persist the group once we make progress (or it's done) so a partial build
  // stays resumable; persist managed every chunk so created accounts survive.
  const persistGroup = !existing && (sync.created > 0 || done);
  const groups = persistGroup ? [...config.groups, group] : config.groups;
  await writeConfig({ ...config, groups, managed: [...managed] });
  return {
    success: sync.errors.length === 0,
    error: sync.errors.length > 0 ? syncFailure(sync) : undefined,
    sync,
    done,
    created: sync.created,
    total,
    remaining,
  };
}

export async function deleteGroupAction(
  number: string,
  deleteUsers: boolean,
): Promise<GroupActionResult> {
  const denied = await requireAdmin();
  if (denied) return fail(denied);

  const config = await readConfig();
  const group = config.groups.find((g) => g.number === number);
  // Group already gone (a prior chunk removed it) → deletion is complete.
  if (!group) return { success: true, done: true, deleted: 0, total: 0, remaining: 0 };

  const managed = loadManaged(config);
  if (!deleteUsers) {
    await writeConfig({
      ...config,
      groups: config.groups.filter((g) => g.number !== number),
      managed: [...managed],
    });
    return { success: true, done: true, deleted: 0, total: 0, remaining: 0 };
  }

  // Delete accounts in chunks; keep the group until every account is gone so a
  // resuming chunk can recompute the name set. Remove it only once done.
  const names = expectedUsernamesForGroup(group, config.topics);
  const { result: sync, total, remaining } = await syncDeleteUsernamesChunk(names, managed, CHUNK);
  updateTag("users");
  const done = remaining === 0 && sync.errors.length === 0;
  const groups = done ? config.groups.filter((g) => g.number !== number) : config.groups;
  await writeConfig({ ...config, groups, managed: [...managed] });
  return {
    success: sync.errors.length === 0,
    error: sync.errors.length > 0 ? syncFailure(sync) : undefined,
    sync,
    done,
    deleted: sync.deleted,
    total,
    remaining,
  };
}

export async function renumberGroupAction(
  oldNumber: string,
  rawNewNumber: string,
  offset: number,
): Promise<GroupActionResult> {
  const denied = await requireAdmin();
  if (denied) return fail(denied);

  const newNumber = rawNewNumber.trim();
  if (!NUM.test(newNumber)) return fail("組別編號必須為數字");
  if (newNumber === oldNumber) return { success: true, done: true, total: 0, offset: 0 };

  const config = await readConfig();
  const group = config.groups.find((g) => g.number === oldNumber);
  if (!group) return fail(`找不到組別 ${oldNumber}`);
  if (config.groups.some((g) => g.number === newNumber)) return fail(`組別 ${newNumber} 已存在`);

  const updated: Group = { ...group, number: newNumber };
  const managed = loadManaged(config);
  const {
    result: sync,
    total,
    offset: newOffset,
    done,
    renamesRemaining,
  } = await syncRenumberGroupChunk(oldNumber, updated, config.topics, managed, offset, CHUNK);
  updateTag("users");

  // Commit the new number once the whole op list is processed AND every group
  // account has actually been renamed. The renames are destructive, so once they
  // land, config MUST match them even if a personal-password PATCH failed — a
  // mismatched group number would strand accounts, whereas a stale password is
  // recoverable by removing and re-adding that member (which recreates their
  // accounts with the current number's password). If a rename itself failed,
  // keep the old number so a re-run resumes from the same baseline.
  const persistNumber = done && renamesRemaining === 0;
  const groups = persistNumber
    ? config.groups.map((g) => (g.number === oldNumber ? updated : g))
    : config.groups;
  await writeConfig({ ...config, groups, managed: [...managed] });
  return {
    success: sync.errors.length === 0,
    error: sync.errors.length > 0 ? syncFailure(sync) : undefined,
    sync,
    done,
    offset: newOffset,
    total,
    created: sync.created,
    deleted: sync.deleted,
    updated: sync.updated,
  };
}

export async function updateMembersAction(
  number: string,
  rawMembers: string[],
): Promise<GroupActionResult> {
  const denied = await requireAdmin();
  if (denied) return fail(denied);

  const newMembers = rawMembers.map((m) => m.trim()).filter(Boolean);
  if (newMembers.some((m) => !NUM.test(m))) return fail("組員編號必須為數字");
  if (new Set(newMembers).size !== newMembers.length) return fail("組員編號重複");

  const config = await readConfig();
  const group = config.groups.find((g) => g.number === number);
  if (!group) return fail(`找不到組別 ${number}`);

  const takenByOthers = new Set(
    config.groups.filter((g) => g.number !== number).flatMap((g) => g.members),
  );
  const dup = newMembers.find((m) => takenByOthers.has(m));
  if (dup) return fail(`組員編號 ${dup} 已屬於其他組別`);

  const oldSet = new Set(group.members);
  const newSet = new Set(newMembers);
  const added = newMembers.filter((m) => !oldSet.has(m));
  const removed = group.members.filter((m) => !newSet.has(m));
  if (added.length === 0 && removed.length === 0) {
    // Only reordered — persist the list, no account churn.
    await writeConfig({
      ...config,
      groups: config.groups.map((g) => (g.number === number ? { ...group, members: newMembers } : g)),
      managed: [...loadManaged(config)],
    });
    return { success: true, done: true, created: 0, deleted: 0, total: 0, remaining: 0 };
  }

  const updated: Group = { ...group, members: newMembers };
  const personalTopics = config.topics.filter((t) => t.type === "personal");
  const managed = loadManaged(config);
  const { result: sync, total, remaining } = await syncUpdateMembersChunk(
    updated,
    added,
    removed,
    personalTopics,
    managed,
    CHUNK,
  );
  updateTag("users");
  const done = remaining === 0 && sync.errors.length === 0;
  // Persist the new member list only once the account reconcile finished, so a
  // resuming chunk still derives the same added/removed sets from the old list.
  const groups = done ? config.groups.map((g) => (g.number === number ? updated : g)) : config.groups;
  await writeConfig({ ...config, groups, managed: [...managed] });
  return {
    success: sync.errors.length === 0,
    error: sync.errors.length > 0 ? syncFailure(sync) : undefined,
    sync,
    done,
    created: sync.created,
    deleted: sync.deleted,
    total,
    remaining,
  };
}
