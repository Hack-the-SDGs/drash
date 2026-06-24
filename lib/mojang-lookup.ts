"use server";

interface MojangProfile {
  id: string;
  name: string;
}

export type MojangLookupResult =
  | { uuid: string; name: string; error?: never }
  | { error: string; uuid?: never; name?: never };

/** Look up a Minecraft player UUID from Mojang by username. */
export async function lookupMojangUuid(
  username: string,
): Promise<MojangLookupResult | null> {
  try {
    const res = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`,
    );
    if (res.status === 404 || res.status === 204) return null;
    if (!res.ok) return { error: `Mojang API ${res.status}: ${await res.text().catch(() => "")}` };

    const data: MojangProfile = await res.json();
    const uuid = data.id.replace(
      /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
      "$1-$2-$3-$4-$5",
    );
    return { uuid, name: data.name };
  } catch (e) {
    return { error: `fetch failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}
