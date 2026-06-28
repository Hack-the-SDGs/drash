import type { Group, Topic } from "./types";

const PW_PREFIX = "Hack-The-SDGs-Python@";

/** Hex-encoded SHA-256 of the input string (Web Crypto, available on Workers). */
export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function personalUsername(member: string, code: string): string {
  return `${member}_${code}`;
}

export function groupUsername(group: string, code: string): string {
  return `G${group}_${code}`;
}

export function personalPassword(group: string, member: string): Promise<string> {
  return sha256Hex(`${PW_PREFIX}${group}:${member}`);
}

export function groupPassword(group: string): Promise<string> {
  return sha256Hex(`${PW_PREFIX}${group}`);
}

export interface GeneratedAccount {
  username: string;
  password: string;
}

/** Accounts a single topic implies for one group (with computed passwords). */
export async function accountsForTopicInGroup(
  group: Group,
  topic: Topic,
): Promise<GeneratedAccount[]> {
  if (topic.type === "group") {
    return [
      { username: groupUsername(group.number, topic.code), password: await groupPassword(group.number) },
    ];
  }
  return Promise.all(
    group.members.map(async (m) => ({
      username: personalUsername(m, topic.code),
      password: await personalPassword(group.number, m),
    })),
  );
}

/** All usernames a group is expected to own across the given topics (no passwords). */
export function expectedUsernamesForGroup(group: Group, topics: Topic[]): string[] {
  const names: string[] = [];
  for (const t of topics) {
    if (t.type === "group") names.push(groupUsername(group.number, t.code));
    else for (const m of group.members) names.push(personalUsername(m, t.code));
  }
  return names;
}

/** All usernames a single topic is expected to own across the given groups. */
export function expectedUsernamesForTopic(topic: Topic, groups: Group[]): string[] {
  const names: string[] = [];
  for (const g of groups) {
    if (topic.type === "group") names.push(groupUsername(g.number, topic.code));
    else for (const m of g.members) names.push(personalUsername(m, topic.code));
  }
  return names;
}
