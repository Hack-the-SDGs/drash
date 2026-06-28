"use server";

import { updateTag } from "next/cache";
import { readConfig, writeConfig } from "@/lib/groups/store";
import { requireAdmin } from "@/lib/groups/guard";
import {
  syncCreateTopic,
  syncDeleteUsernames,
  syncSetTopicLock,
  type SyncResult,
} from "@/lib/groups/sync";
import { expectedUsernamesForTopic } from "@/lib/groups/naming";
import type { Topic, TopicType } from "@/lib/groups/types";

const CODE = /^[a-z0-9_]+$/;

export interface TopicActionResult {
  success: boolean;
  error?: string;
  sync?: SyncResult;
}

function fail(error: string): TopicActionResult {
  return { success: false, error };
}

export async function createTopicAction(
  rawName: string,
  rawCode: string,
  type: TopicType,
): Promise<TopicActionResult> {
  const denied = await requireAdmin();
  if (denied) return fail(denied);

  const name = rawName.trim();
  const code = rawCode.trim();
  if (!name) return fail("題目名稱必填");
  if (!CODE.test(code)) return fail("題目代號只能包含小寫英文、數字、底線");
  if (type !== "personal" && type !== "group") return fail("題目類型不正確");

  const config = await readConfig();
  if (config.topics.some((t) => t.code === code)) return fail(`題目代號 ${code} 已存在`);

  const topic: Topic = { name, code, type, open: true };
  await writeConfig({ ...config, topics: [...config.topics, topic] });
  const sync = await syncCreateTopic(config.groups, topic);
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

  await writeConfig({
    ...config,
    topics: config.topics.map((t) => (t.code === code ? { ...t, open } : t)),
  });
  // open -> unlock accounts; closed -> lock accounts.
  const sync = await syncSetTopicLock(topic, config.groups, !open);
  updateTag("users");
  return { success: true, sync };
}

export async function updateTopicNameAction(
  code: string,
  rawName: string,
): Promise<TopicActionResult> {
  const denied = await requireAdmin();
  if (denied) return fail(denied);

  const name = rawName.trim();
  if (!name) return fail("題目名稱必填");

  const config = await readConfig();
  const topic = config.topics.find((t) => t.code === code);
  if (!topic) return fail(`找不到題目 ${code}`);

  await writeConfig({
    ...config,
    topics: config.topics.map((t) => (t.code === code ? { ...t, name } : t)),
  });
  return { success: true };
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

  await writeConfig({ ...config, topics: config.topics.filter((t) => t.code !== code) });
  let sync: SyncResult | undefined;
  if (deleteUsers) {
    sync = await syncDeleteUsernames(expectedUsernamesForTopic(topic, config.groups));
    updateTag("users");
  }
  return { success: true, sync };
}
