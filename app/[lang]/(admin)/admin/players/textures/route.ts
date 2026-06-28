import type { NextRequest } from "next/server";
import { getPlayer } from "@/lib/drasl/players";
import { resolvePlayerTextures } from "@/lib/drasl/textures";

/**
 * On-demand skin resolution for a single player. Used by LazyPlayerHead so the
 * players table renders instantly and only resolves textures for rows that
 * actually scroll into view (and only when the player has no direct skinUrl).
 */
export async function GET(request: NextRequest) {
  const uuid = request.nextUrl.searchParams.get("uuid");
  if (!uuid) {
    return Response.json({ error: "missing uuid" }, { status: 400 });
  }
  try {
    const player = await getPlayer(uuid);
    const textures = await resolvePlayerTextures(player);
    return Response.json({ skinUrl: textures.skinUrl ?? null });
  } catch {
    return Response.json({ skinUrl: null });
  }
}
