"use server";

import { updateTag } from "next/cache";
import { readConfig, writeConfig } from "@/lib/groups/store";
import { requireAdmin } from "@/lib/groups/guard";
import {
  syncCreateTopicChunk,
  syncDeleteUsernamesChunk,
  syncSetTopicLockChunk,
  syncUpdateTopicBotCountChunk,
  type SyncResult,
} from "@/lib/groups/sync";
import { expectedUsernamesForTopic, loadManaged } from "@/lib/groups/naming";
import { MAX_BOT_COUNT, type Topic, type TopicType } from "@/lib/groups/types";

const CODE = /^[a-z0-9_]+$/;

// Account operations per chunked call. 1 getUsers + <=40 create/delete/update =
// 41 subrequests, safely under the Cloudflare Workers free-plan cap of 50 per
// request. Big topics are built/changed/removed over several calls (client loops).
const CHUNK = 40;

export interface TopicActionResult {
  success: boolean;
  error?: string;
  sync?: SyncResult;
  done?: boolean; // the whole operation is complete
  created?: number; // accounts created in THIS call
  deleted?: number; // accounts deleted in THIS call
  updated?: number; // accounts locked/unlocked in THIS call
  total?: number; // operation size (denominator for progress)
  remaining?: number; // work still left after this call
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
  const existing = config.topics.find((t) => t.code === code);
  // Same code but a different shape is a real conflict. Same shape that's only
  // partially built means this call resumes the build (the client loops until
  // done), so a big topic can be created across several sub-request-bounded calls.
  if (existing && (existing.type !== type || existing.botCount !== botCount)) {
    return fail(`題目代號 ${code} 已存在`);
  }
  const topic: Topic = existing ?? { name, code, type, open: true, botCount };
  const managed = loadManaged(config);

  const { result: sync, total, before, remaining } = await syncCreateTopicChunk(
    config.groups,
    topic,
    managed,
    CHUNK,
  );
  // Already fully built and it existed → a genuine duplicate.
  if (existing && before === 0) return fail(`題目代號 ${code} 已存在`);
  updateTag("users");

  const done = remaining === 0 && sync.errors.length === 0;
  // Persist the topic once we've made progress (or it's done) so a partial build
  // stays visible and resumable; persist `managed` every chunk so created
  // accounts are never lost. A brand-new topic whose first chunk created nothing
  // (all collisions) isn't persisted — no ghost 0-account topic.
  const persistTopic = !existing && (sync.created > 0 || done);
  const topics = persistTopic ? [...config.topics, topic] : config.topics;
  await writeConfig({ ...config, topics, managed: [...managed] });

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

export async function setTopicOpenAction(
  code: string,
  open: boolean,
): Promise<TopicActionResult> {
  const denied = await requireAdmin();
  if (denied) return fail(denied);

  const config = await readConfig();
  const topic = config.topics.find((t) => t.code === code);
  if (!topic) return fail(`找不到題目 ${code}`);

  // Lock/unlock accounts in chunks; persist the open flag only once every
  // account reached the target state, so the UI never shows "closed" while
  // accounts stay unlocked. The client loops until done.
  const managed = loadManaged(config);
  const { result: sync, total, remaining } = await syncSetTopicLockChunk(
    topic,
    config.groups,
    !open,
    managed,
    CHUNK,
  );
  updateTag("users");
  const done = remaining === 0 && sync.errors.length === 0;
  const topics = done
    ? config.topics.map((t) => (t.code === code ? { ...t, open } : t))
    : config.topics;
  await writeConfig({ ...config, topics, managed: [...managed] });
  return {
    success: sync.errors.length === 0,
    error: sync.errors.length > 0 ? syncFailure(sync) : undefined,
    sync,
    done,
    updated: sync.updated,
    total,
    remaining,
  };
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

  // Name-only change: instant, no account churn.
  if (topic.botCount === botCount) {
    await writeConfig({
      ...config,
      topics: config.topics.map((t) => (t.code === code ? updated : t)),
      managed: [...managed],
    });
    return { success: true, done: true, created: 0, deleted: 0, total: 0, remaining: 0 };
  }

  // Bot-count change reconciles accounts in chunks; the client loops until done.
  const { result: sync, total, remaining } = await syncUpdateTopicBotCountChunk(
    topic,
    updated,
    config.groups,
    managed,
    CHUNK,
  );
  updateTag("users");
  const done = remaining === 0 && sync.errors.length === 0;
  // Apply the name immediately, but keep the OLD botCount until the reconcile
  // finishes so a resuming chunk can still derive the removed name set.
  const topics = config.topics.map((t) =>
    t.code === code ? (done ? updated : { ...topic, name }) : t,
  );
  await writeConfig({ ...config, topics, managed: [...managed] });
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

export async function deleteTopicAction(
  code: string,
  deleteUsers: boolean,
): Promise<TopicActionResult> {
  const denied = await requireAdmin();
  if (denied) return fail(denied);

  const config = await readConfig();
  const topic = config.topics.find((t) => t.code === code);
  // Topic already gone (a prior chunk removed it) → deletion is complete.
  if (!topic) return { success: true, done: true, deleted: 0, total: 0, remaining: 0 };

  const managed = loadManaged(config);
  if (!deleteUsers) {
    await writeConfig({
      ...config,
      topics: config.topics.filter((t) => t.code !== code),
      managed: [...managed],
    });
    return { success: true, done: true, deleted: 0, total: 0, remaining: 0 };
  }

  // Delete accounts in chunks; keep the topic until every account is gone so a
  // resuming chunk can recompute the name set. Remove it only once done.
  const names = expectedUsernamesForTopic(topic, config.groups);
  const { result: sync, total, remaining } = await syncDeleteUsernamesChunk(names, managed, CHUNK);
  updateTag("users");
  const done = remaining === 0 && sync.errors.length === 0;
  const topics = done ? config.topics.filter((t) => t.code !== code) : config.topics;
  await writeConfig({ ...config, topics, managed: [...managed] });
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
