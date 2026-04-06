"use server";

import { cache } from "react";

interface MojangProfile {
  id: string;
  name: string;
}

/** Check if a player UUID exists in Mojang's database. */
export const checkMojangUuid = cache(async (uuid: string): Promise<boolean> => {
  try {
    const cleanUuid = uuid.replace(/-/g, "");
    const res = await fetch(
      `https://sessionserver.mojang.com/session/minecraft/profile/${cleanUuid}`,
      { next: { revalidate: 3600 } },
    );
    return res.status === 200;
  } catch {
    return false;
  }
});

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
    // Mojang returns UUID without dashes — insert them
    const uuid = data.id.replace(
      /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
      "$1-$2-$3-$4-$5",
    );
    return { uuid, name: data.name };
  } catch {
    return null;
  }
}
