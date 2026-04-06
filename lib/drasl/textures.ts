const DRASL_API_URL = process.env.DRASL_API_URL ?? "https://drasl.ntust.camp";

interface TextureInfo {
  skinUrl?: string;
  capeUrl?: string;
  skinModel?: "classic" | "slim";
}

interface MojangProfile {
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

/**
 * Resolve the actual skin/cape URLs for a player.
 * If the player has skinUrl/capeUrl set directly, use those.
 * Otherwise, query Drasl's session server (which handles Mojang fallback)
 * to get the textures.
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

  // Query Drasl's session server for texture data
  try {
    const profileUrl = `${DRASL_API_URL}/session/minecraft/profile/${player.uuid.replace(/-/g, "")}`;
    const res = await fetch(profileUrl, {
      cache: "force-cache",
      next: { revalidate: 300, tags: ["textures"] },
    });

    if (!res.ok) {
      return {
        skinUrl: player.skinUrl || undefined,
        capeUrl: player.capeUrl || undefined,
        skinModel: player.skinModel as "classic" | "slim",
      };
    }

    const profile: MojangProfile = await res.json();
    const texturesProp = profile.properties.find(
      (p) => p.name === "textures",
    );

    if (!texturesProp) {
      return {
        skinUrl: player.skinUrl || undefined,
        capeUrl: player.capeUrl || undefined,
        skinModel: player.skinModel as "classic" | "slim",
      };
    }

    const decoded: TexturesPayload = JSON.parse(
      atob(texturesProp.value),
    );

    const resolvedSkinUrl =
      player.skinUrl || decoded.textures.SKIN?.url || undefined;
    const resolvedCapeUrl =
      player.capeUrl || decoded.textures.CAPE?.url || undefined;
    const resolvedModel =
      (player.skinModel as "classic" | "slim") ||
      (decoded.textures.SKIN?.metadata?.model === "slim"
        ? "slim"
        : "classic");

    return {
      skinUrl: resolvedSkinUrl,
      capeUrl: resolvedCapeUrl,
      skinModel: resolvedModel,
    };
  } catch {
    return {
      skinUrl: player.skinUrl || undefined,
      capeUrl: player.capeUrl || undefined,
      skinModel: player.skinModel as "classic" | "slim",
    };
  }
}
