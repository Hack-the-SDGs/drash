// Augments the OpenNext-provided CloudflareEnv with this app's own bindings.
// Minimal structural KV type — avoids pulling in @cloudflare/workers-types just
// for get/put.
interface DrashKVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

declare global {
  interface CloudflareEnv {
    /** KV namespace holding the groups/topics config document (key: "config"). */
    GROUPS_KV: DrashKVNamespace;
  }
}

export {};
