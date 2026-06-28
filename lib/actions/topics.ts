"use server";

import { updateTag } from "next/cache";
import { readConfig, writeConfig } from "@/lib/groups/store";
import { requireAdmin } from "@/lib/groups/guard";
import {
  syncCreateTopic,
  syncDeleteUsernames,
  syncSetTopicLock,
  syncUpdateTopicBotCount,
  type SyncResult,
} from "@/lib/groups/sync";
import { expectedUsernamesForTopic, loadManaged } from "@/lib/groups/naming";
import { MAX_BOT_COUNT, type Topic, type TopicType } from "@/lib/groups/types";

const CODE = /^[a-z0-9_]+$/;

export interface TopicActionResult {
  success: boolean;
  error?: string;
  sync?: SyncResult;
}

function fail(error: string): TopicActionResult {
  return { success: false, error };
}

function syncFailure(sync: SyncResult): string {
  return `部分帳號操作失敗（${sync.errors.length}）`;
}

/** Reject anything that isn't an integer bot count in [1, MAX_BOT_COUNT]. */
function botCountError(botCount: number): string | null {
  if (!Number.isInteger(botCount) || botCount < 1) return "機器人數量至少為 1";
  if (botCount > MAX_BOT_COUNT) return `機器人數量最多 ${MAX_BOT_COUNT}`;
  return null;
}

export async function createTopicAction(
  rawName: string,
  rawCode: string,
  type: TopicType,
  botCount: number,
): Promise<TopicActionResult> {
  const denied = await requireAdmin();
  if (denied) return fail(denied);

  const name = rawName.trim();
  const code = rawCode.trim();
  if (!name) return fail("題目名稱必填");
  if (!CODE.test(code)) return fail("題目代號只能包含小寫英文、數字、底線");
  if (type !== "personal" && type !== "group") return fail("題目類型不正確");
  const botErr = botCountError(botCount);
  if (botErr) return fail(botErr);

  const config = await readConfig();
  if (config.topics.some((t) => t.code === code)) return fail(`題目代號 ${code} 已存在`);

  const topic: Topic = { name, code, type, open: true, botCount };
  // Create accounts first, then persist config + the updated registry.
  const managed = loadManaged(config);
  const sync = await syncCreateTopic(config.groups, topic, managed);
  await writeConfig({
    ...config,
    topics: [...config.topics, topic],
    managed: [...managed],
  });
  updateTag("users");
  return { success: true, sync };
}

export async function setTopicOpenAction(
  code: string,
  open: boolean,
): Promise<TopicActionResult> {
  const denied = await requireAdmin();
  if (denied) return fail(denied);

  const config = await readConfig();
  const topic = config.topics.find((t) => t.code === code);
  if (!topic) return fail(`找不到題目 ${code}`);

  // Lock/unlock accounts first; only persist the open flag if it fully
  // succeeded, so the UI never shows "closed" while accounts stay unlocked.
  const managed = loadManaged(config);
  const sync = await syncSetTopicLock(topic, config.groups, !open, managed);
  updateTag("users");
  if (sync.errors.length > 0) {
    await writeConfig({ ...config, managed: [...managed] });
    return { success: false, error: syncFailure(sync), sync };
  }
  await writeConfig({
    ...config,
    topics: config.topics.map((t) => (t.code === code ? { ...t, open } : t)),
    managed: [...managed],
  });
  return { success: true, sync };
}

export async function updateTopicAction(
  code: string,
  rawName: string,
  botCount: number,
): Promise<TopicActionResult> {
  const denied = await requireAdmin();
  if (denied) return fail(denied);

  const name = rawName.trim();
  if (!name) return fail("題目名稱必填");
  const botErr = botCountError(botCount);
  if (botErr) return fail(botErr);

  const config = await readConfig();
  const topic = config.topics.find((t) => t.code === code);
  if (!topic) return fail(`找不到題目 ${code}`);

  const updated: Topic = { ...topic, name, botCount };
  const managed = loadManaged(config);

  // Changing bot count adds/removes the suffixed accounts.
  let sync: SyncResult | undefined;
  if (topic.botCount !== botCount) {
    sync = await syncUpdateTopicBotCount(topic, updated, config.groups, managed);
    updateTag("users");
  }
  await writeConfig({
    ...config,
    topics: config.topics.map((t) => (t.code === code ? updated : t)),
    managed: [...managed],
  });
  return { success: true, sync };
}

export async function deleteTopicAction(
  code: string,
  deleteUsers: boolean,
): Promise<TopicActionResult> {
  const denied = await requireAdmin();
  if (denied) return fail(denied);

  const config = await readConfig();
  const topic = config.topics.find((t) => t.code === code);
  if (!topic) return fail(`找不到題目 ${code}`);

  const managed = loadManaged(config);
  let sync: SyncResult | undefined;
  if (deleteUsers) {
    // Delete accounts first; keep the topic if any deletion failed so the
    // lingering accounts stay owned/manageable.
    sync = await syncDeleteUsernames(expectedUsernamesForTopic(topic, config.groups), managed);
    updateTag("users");
    if (sync.errors.length > 0) {
      await writeConfig({ ...config, managed: [...managed] });
      return { success: false, error: syncFailure(sync), sync };
    }
  }
  await writeConfig({
    ...config,
    topics: config.topics.filter((t) => t.code !== code),
    managed: [...managed],
  });
  return { success: true, sync };
}
