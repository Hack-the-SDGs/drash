"use server";

import { updateTag } from "next/cache";
import { createPlayer, updatePlayer, deletePlayer } from "@/lib/drasl/players";
import { DraslAPIError } from "@/lib/drasl/client";
import type {
  APICreatePlayerRequest,
  APIUpdatePlayerRequest,
} from "@/lib/types";

export async function createPlayerAction(formData: FormData) {
  const name = formData.get("name") as string;

  if (!name) {
    return { success: false, error: "Player name is required" };
  }

  const data: APICreatePlayerRequest = { name };

  const userUuid = formData.get("userUuid") as string | null;
  if (userUuid) data.userUuid = userUuid;

  const chosenUuid = formData.get("chosenUuid") as string | null;
  if (chosenUuid) data.chosenUuid = chosenUuid;

  const existingPlayer = formData.get("existingPlayer");
  if (existingPlayer === "true") data.existingPlayer = true;

  const fallbackPlayer = formData.get("fallbackPlayer") as string | null;
  if (fallbackPlayer) data.fallbackPlayer = fallbackPlayer;

  const challengeToken = formData.get("challengeToken") as string | null;
  if (challengeToken) data.challengeToken = challengeToken;

  const skinModel = formData.get("skinModel") as string | null;
  if (skinModel === "classic" || skinModel === "slim") {
    data.skinModel = skinModel;
  }

  const skinUrl = formData.get("skinUrl") as string | null;
  if (skinUrl) data.skinUrl = skinUrl;

  const capeUrl = formData.get("capeUrl") as string | null;
  if (capeUrl) data.capeUrl = capeUrl;

  const skinFile = formData.get("skinFile") as File | null;
  if (skinFile && skinFile.size > 0) {
    const buffer = await skinFile.arrayBuffer();
    data.skinBase64 = Buffer.from(buffer).toString("base64");
  }

  const capeFile = formData.get("capeFile") as File | null;
  if (capeFile && capeFile.size > 0) {
    const buffer = await capeFile.arrayBuffer();
    data.capeBase64 = Buffer.from(buffer).toString("base64");
  }

  try {
    await createPlayer(data);
    updateTag("players");
    updateTag("users");
    updateTag("current-user");
    return { success: true };
  } catch (e) {
    if (e instanceof DraslAPIError) {
      return { success: false, error: e.message };
    }
    throw e;
  }
}

export async function updatePlayerAction(uuid: string, formData: FormData) {
  const data: APIUpdatePlayerRequest = {};

  const name = formData.get("name") as string | null;
  if (name) data.name = name;

  const fallbackPlayer = formData.get("fallbackPlayer") as string | null;
  if (fallbackPlayer) data.fallbackPlayer = fallbackPlayer;

  const skinModel = formData.get("skinModel") as string | null;
  if (skinModel === "classic" || skinModel === "slim") {
    data.skinModel = skinModel;
  }

  const skinUrl = formData.get("skinUrl") as string | null;
  if (skinUrl) data.skinUrl = skinUrl;

  const capeUrl = formData.get("capeUrl") as string | null;
  if (capeUrl) data.capeUrl = capeUrl;

  const deleteSkin = formData.get("deleteSkin");
  if (deleteSkin === "true") data.deleteSkin = true;

  const deleteCape = formData.get("deleteCape");
  if (deleteCape === "true") data.deleteCape = true;

  const skinFile = formData.get("skinFile") as File | null;
  if (skinFile && skinFile.size > 0) {
    const buffer = await skinFile.arrayBuffer();
    data.skinBase64 = Buffer.from(buffer).toString("base64");
  }

  const capeFile = formData.get("capeFile") as File | null;
  if (capeFile && capeFile.size > 0) {
    const buffer = await capeFile.arrayBuffer();
    data.capeBase64 = Buffer.from(buffer).toString("base64");
  }

  try {
    await updatePlayer(uuid, data);
    updateTag("players");
    updateTag("users");
    updateTag("current-user");
    return { success: true };
  } catch (e) {
    if (e instanceof DraslAPIError) {
      return { success: false, error: e.message };
    }
    throw e;
  }
}

export interface BatchPlayerResult {
  uuid: string;
  success: boolean;
  error?: string;
}

export async function batchDeletePlayersAction(uuids: string[]): Promise<BatchPlayerResult[]> {
  const results: BatchPlayerResult[] = [];

  for (const uuid of uuids) {
    try {
      await deletePlayer(uuid);
      results.push({ uuid, success: true });
    } catch (e) {
      const message = e instanceof DraslAPIError ? e.message : "Unknown error";
      results.push({ uuid, success: false, error: message });
    }
  }

  updateTag("players");
  updateTag("users");
  updateTag("current-user");
  return results;
}

export async function deletePlayerAction(uuid: string) {
  try {
    await deletePlayer(uuid);
    updateTag("players");
    updateTag("users");
    updateTag("current-user");
    return { success: true };
  } catch (e) {
    if (e instanceof DraslAPIError) {
      return { success: false, error: e.message };
    }
    throw e;
  }
}
