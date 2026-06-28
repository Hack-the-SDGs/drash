"use server";

import { updateTag } from "next/cache";
import { readConfig, writeConfig } from "@/lib/groups/store";
import { requireAdmin } from "@/lib/groups/guard";
import {
  syncCreateGroup,
  syncDeleteUsernames,
  syncRenumberGroup,
  syncUpdateMembers,
  type SyncResult,
} from "@/lib/groups/sync";
import { expectedUsernamesForGroup, loadManaged } from "@/lib/groups/naming";
import type { Group } from "@/lib/groups/types";

const NUM = /^\d+$/;

export interface GroupActionResult {
  success: boolean;
  error?: string;
  sync?: SyncResult;
}

function fail(error: string): GroupActionResult {
  return { success: false, error };
}

/** Summary message when some account operations failed (for destructive ops). */
function syncFailure(sync: SyncResult): string {
  return `部分帳號操作失敗（${sync.errors.length}）`;
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
  if (config.groups.some((g) => g.number === number)) return fail(`組別 ${number} 已存在`);
  const taken = new Set(config.groups.flatMap((g) => g.members));
  const dup = members.find((m) => taken.has(m));
  if (dup) return fail(`組員編號 ${dup} 已屬於其他組別`);

  const group: Group = { number, members };
  // Create accounts first, then persist config so the registry reflects what
  // actually got created (and a phantom config isn't left behind on failure).
  const managed = loadManaged(config);
  const sync = await syncCreateGroup(group, config.topics, managed);
  await writeConfig({
    ...config,
    groups: [...config.groups, group],
    managed: [...managed],
  });
  updateTag("users");
  return { success: true, sync };
}

export async function deleteGroupAction(
  number: string,
  deleteUsers: boolean,
): Promise<GroupActionResult> {
  const denied = await requireAdmin();
  if (denied) return fail(denied);

  const config = await readConfig();
  const group = config.groups.find((g) => g.number === number);
  if (!group) return fail(`找不到組別 ${number}`);

  const managed = loadManaged(config);
  let sync: SyncResult | undefined;
  if (deleteUsers) {
    // Delete accounts first; keep the group in config if any deletion failed so
    // the lingering accounts stay owned/manageable.
    sync = await syncDeleteUsernames(expectedUsernamesForGroup(group, config.topics), managed);
    updateTag("users");
    if (sync.errors.length > 0) {
      await writeConfig({ ...config, managed: [...managed] });
      return { success: false, error: syncFailure(sync), sync };
    }
  }
  await writeConfig({
    ...config,
    groups: config.groups.filter((g) => g.number !== number),
    managed: [...managed],
  });
  return { success: true, sync };
}

export async function renumberGroupAction(
  oldNumber: string,
  rawNewNumber: string,
): Promise<GroupActionResult> {
  const denied = await requireAdmin();
  if (denied) return fail(denied);

  const newNumber = rawNewNumber.trim();
  if (!NUM.test(newNumber)) return fail("組別編號必須為數字");
  if (newNumber === oldNumber) return { success: true };

  const config = await readConfig();
  const group = config.groups.find((g) => g.number === oldNumber);
  if (!group) return fail(`找不到組別 ${oldNumber}`);
  if (config.groups.some((g) => g.number === newNumber)) return fail(`組別 ${newNumber} 已存在`);

  const updated: Group = { ...group, number: newNumber };
  const managed = loadManaged(config);
  const sync = await syncRenumberGroup(oldNumber, updated, config.topics, managed);
  await writeConfig({
    ...config,
    groups: config.groups.map((g) => (g.number === oldNumber ? updated : g)),
    managed: [...managed],
  });
  updateTag("users");
  return { success: sync.errors.length === 0, error: sync.errors.length ? syncFailure(sync) : undefined, sync };
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

  const updated: Group = { ...group, members: newMembers };
  const personalTopics = config.topics.filter((t) => t.type === "personal");
  const managed = loadManaged(config);
  const sync = await syncUpdateMembers(updated, added, removed, personalTopics, managed);
  await writeConfig({
    ...config,
    groups: config.groups.map((g) => (g.number === number ? updated : g)),
    managed: [...managed],
  });
  updateTag("users");
  return { success: sync.errors.length === 0, error: sync.errors.length ? syncFailure(sync) : undefined, sync };
}
