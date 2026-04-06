const DRASL_API_URL = process.env.DRASL_API_URL ?? "https://drasl.ntust.camp";

interface TextureInfo {
  skinUrl?: string;
  capeUrl?: string;
  skinModel?: "classic" | "slim";
}

interface SessionProfile {
  id: string;
  name: string;
  properties: {
    name: string;
    value: string;
  }[];
}

interface TexturesPayload {
  textures: {
    SKIN?: {
      url: string;
      metadata?: {
        model?: string;
      };
    };
    CAPE?: {
      url: string;
    };
  };
}

/** Decode textures from a session profile's properties. */
function decodeTextures(profile: SessionProfile): TexturesPayload | null {
  const prop = profile.properties.find((p) => p.name === "textures");
  if (!prop) return null;
  try {
    return JSON.parse(Buffer.from(prop.value, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

/** Fetch and decode textures from a session server. */
async function fetchSessionTextures(
  baseUrl: string,
  uuid: string,
): Promise<TexturesPayload | null> {
  try {
    const res = await fetch(
      `${baseUrl}/session/minecraft/profile/${uuid.replace(/-/g, "")}`,
      { cache: "force-cache", next: { revalidate: 300, tags: ["textures"] } },
    );
    if (!res.ok) return null;
    const profile: SessionProfile = await res.json();
    return decodeTextures(profile);
  } catch {
    return null;
  }
}

/**
 * Resolve the actual skin/cape URLs for a player.
 * If the player has skinUrl/capeUrl set directly, use those.
 * Otherwise, query Drasl's session server (which handles Mojang fallback)
 * to get the textures. If cape is still missing, fall back to Mojang's
 * session server directly.
 */
export async function resolvePlayerTextures(player: {
  uuid: string;
  skinUrl?: string;
  capeUrl?: string;
  skinModel?: string;
}): Promise<TextureInfo> {
  // If both skin and cape are already set, no need to resolve
  if (player.skinUrl && player.capeUrl) {
    return {
      skinUrl: player.skinUrl,
      capeUrl: player.capeUrl,
      skinModel: player.skinModel as "classic" | "slim",
    };
  }

  // Query Drasl's session server
  const draslTextures = await fetchSessionTextures(DRASL_API_URL, player.uuid);

  let skinUrl = player.skinUrl || draslTextures?.textures.SKIN?.url || undefined;
  let capeUrl = player.capeUrl || draslTextures?.textures.CAPE?.url || undefined;
  let skinModel =
    (player.skinModel as "classic" | "slim") ||
    (draslTextures?.textures.SKIN?.metadata?.model === "slim" ? "slim" : "classic");

  // If cape (or skin) is still missing, try Mojang's session server as fallback
  if (!skinUrl || !capeUrl) {
    const mojangTextures = await fetchSessionTextures(
      "https://sessionserver.mojang.com",
      player.uuid,
    );
    if (mojangTextures) {
      if (!skinUrl) {
        skinUrl = mojangTextures.textures.SKIN?.url || undefined;
        if (!skinModel && mojangTextures.textures.SKIN?.metadata?.model === "slim") {
          skinModel = "slim";
        }
      }
      if (!capeUrl) {
        capeUrl = mojangTextures.textures.CAPE?.url || undefined;
      }
    }
  }

  return { skinUrl, capeUrl, skinModel };
}
