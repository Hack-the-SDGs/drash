import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { EMPTY_CONFIG, type GroupsConfig } from "./types";

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
    // Normalize legacy topics that predate the `open`/`botCount` fields.
    const topics = (parsed.topics ?? []).map((t) => ({
      ...t,
      open: t.open ?? true,
      botCount: t.botCount ?? 1,
    }));
    return { groups: parsed.groups ?? [], topics };
  } catch {
    return EMPTY_CONFIG;
  }
}

// ponytail: single JSON doc, last-write-wins. Admin-only, low write volume.
// Split into per-group keys + optimistic versioning only if write contention shows up.
export async function writeConfig(config: GroupsConfig): Promise<void> {
  await (await kv()).put(KEY, JSON.stringify(config));
}
