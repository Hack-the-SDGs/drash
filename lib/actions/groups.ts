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
import { expectedUsernamesForGroup } from "@/lib/groups/naming";
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
  await writeConfig({ ...config, groups: [...config.groups, group] });
  const sync = await syncCreateGroup(group, config.topics);
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

  await writeConfig({ ...config, groups: config.groups.filter((g) => g.number !== number) });
  let sync: SyncResult | undefined;
  if (deleteUsers) {
    sync = await syncDeleteUsernames(expectedUsernamesForGroup(group, config.topics));
    updateTag("users");
  }
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
  await writeConfig({
    ...config,
    groups: config.groups.map((g) => (g.number === oldNumber ? updated : g)),
  });
  const sync = await syncRenumberGroup(oldNumber, updated, config.topics);
  updateTag("users");
  return { success: true, sync };
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
  await writeConfig({
    ...config,
    groups: config.groups.map((g) => (g.number === number ? updated : g)),
  });
  const personalTopics = config.topics.filter((t) => t.type === "personal");
  const sync = await syncUpdateMembers(updated, added, removed, personalTopics);
  updateTag("users");
  return { success: true, sync };
}
