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
}

export const EMPTY_CONFIG: GroupsConfig = { groups: [], topics: [] };
