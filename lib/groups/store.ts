import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { EMPTY_CONFIG, clampBotCount, type GroupsConfig } from "./types";

const KEY = "config";

async function kv(): Promise<CloudflareEnv["GROUPS_KV"]> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.GROUPS_KV) {
    throw new Error("GROUPS_KV binding is not configured (see wrangler.jsonc)");
  }
  return env.GROUPS_KV;
}

export async function readConfig(): Promise<GroupsConfig> {
  const raw = await (await kv()).get(KEY);
  if (!raw) return EMPTY_CONFIG;
  try {
    const parsed = JSON.parse(raw) as Partial<GroupsConfig>;
    // Normalize topics: coerce open to a real boolean and clamp botCount so a
    // malformed stored value (0, "abc", huge) can't reach expandBots().
    const topics = (parsed.topics ?? []).map((t) => ({
      ...t,
      open: typeof t.open === "boolean" ? t.open : true,
      botCount: clampBotCount(t.botCount),
    }));
    // Keep `managed` undefined for legacy configs so actions can adopt once.
    const managed = Array.isArray(parsed.managed) ? parsed.managed : undefined;
    return { groups: parsed.groups ?? [], topics, managed };
  } catch {
    return EMPTY_CONFIG;
  }
}

// ponytail: single JSON doc, last-write-wins. Admin-only, low write volume.
// Split into per-group keys + optimistic versioning only if write contention shows up.
export async function writeConfig(config: GroupsConfig): Promise<void> {
  await (await kv()).put(KEY, JSON.stringify(config));
}
