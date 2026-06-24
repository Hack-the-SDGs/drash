"use server";

interface MojangProfile {
  id: string;
  name: string;
}

/** Look up a Minecraft player UUID from Mojang by username. */
export async function lookupMojangUuid(
  username: string,
): Promise<{ uuid: string; name: string } | null> {
  try {
    const res = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`,
      { cache: "no-store" },
    );
    if (res.status === 404 || res.status === 204) return null;
    if (!res.ok) return null;

    const data: MojangProfile = await res.json();
    const uuid = data.id.replace(
      /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
      "$1-$2-$3-$4-$5",
    );
    return { uuid, name: data.name };
  } catch {
    return null;
  }
}
