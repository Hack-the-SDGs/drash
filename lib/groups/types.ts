export type TopicType = "personal" | "group";

export interface Group {
  /** Numeric group number, e.g. "1". Unique across the config. */
  number: string;
  /** Member numbers (numeric strings), globally unique across all groups. */
  members: string[];
}

export interface Topic {
  /** Slug used in usernames: lowercase letters, digits, underscore. Unique. */
  code: string;
  /** Display name. */
  name: string;
  type: TopicType;
  /** When false, the topic's generated accounts are locked. Defaults to open. */
  open: boolean;
  /** Bots per group/member. 1 = bare name; >1 appends _1, _2, … Min 1. */
  botCount: number;
}

export interface GroupsConfig {
  groups: Group[];
  topics: Topic[];
  /**
   * Usernames of accounts this system created. Destructive sync only touches
   * names in here, so it never mutates an unrelated account that happens to
   * share a generated name. `undefined` marks a legacy config that predates the
   * registry (adopted on first write).
   */
  managed?: string[];
}

export const EMPTY_CONFIG: GroupsConfig = { groups: [], topics: [] };

/** Maximum bots a single topic may generate per group/member (write-time rule). */
export const MAX_BOT_COUNT = 10;

/**
 * Read-time safety ceiling. Higher than MAX_BOT_COUNT so a pre-cap legacy value
 * (e.g. 12) keeps its extra accounts in the expected/managed set — they can
 * still be locked or deleted — while an absurd value can't allocate a giant
 * username array. The ≤ MAX_BOT_COUNT business rule is enforced only on write.
 */
const STORED_BOT_COUNT_CEILING = 100;

/** Sanitize a stored bot count to a positive integer, bounded for memory safety. */
export function sanitizeStoredBotCount(value: unknown): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, STORED_BOT_COUNT_CEILING);
}
