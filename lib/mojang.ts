import { cache } from "react";

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

export { lookupMojangUuid } from "@/lib/mojang-lookup";
