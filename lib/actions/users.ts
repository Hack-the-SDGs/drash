"use server";

import { updateTag } from "next/cache";
import {
  createUser,
  updateUser,
  deleteUser,
  createUserOIDC,
  deleteUserOIDC,
} from "@/lib/drasl/users";
import { DraslAPIError } from "@/lib/drasl/client";
import type {
  APICreateUserRequest,
  APIUpdateUserRequest,
} from "@/lib/types";

export async function createUserAction(formData: FormData) {
  const username = formData.get("username") as string;

  if (!username) {
    return { success: false, error: "Username is required" };
  }

  const data: APICreateUserRequest = { username };

  const password = formData.get("password") as string | null;
  if (password) data.password = password;

  const playerName = formData.get("playerName") as string | null;
  if (playerName) data.playerName = playerName;

  const chosenUuid = formData.get("chosenUuid") as string | null;
  if (chosenUuid) data.chosenUuid = chosenUuid;

  const existingPlayer = formData.get("existingPlayer");
  if (existingPlayer === "true") data.existingPlayer = true;

  const fallbackPlayer = formData.get("fallbackPlayer") as string | null;
  if (fallbackPlayer) data.fallbackPlayer = fallbackPlayer;

  const inviteCode = formData.get("inviteCode") as string | null;
  if (inviteCode) data.inviteCode = inviteCode;

  const isAdmin = formData.get("isAdmin");
  if (isAdmin === "true") data.isAdmin = true;

  const isLocked = formData.get("isLocked");
  if (isLocked === "true") data.isLocked = true;

  const maxPlayerCount = formData.get("maxPlayerCount") as string | null;
  if (maxPlayerCount) data.maxPlayerCount = parseInt(maxPlayerCount, 10);

  const preferredLanguage = formData.get("preferredLanguage") as string | null;
  if (preferredLanguage) data.preferredLanguage = preferredLanguage;

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
    await createUser(data);
    updateTag("users");
    return { success: true };
  } catch (e) {
    if (e instanceof DraslAPIError) {
      return { success: false, error: e.message };
    }
    throw e;
  }
}

export async function updateUserAction(uuid: string, formData: FormData) {
  const data: APIUpdateUserRequest = {};

  const password = formData.get("password") as string | null;
  if (password) data.password = password;

  const isAdmin = formData.get("isAdmin");
  if (isAdmin === "true") data.isAdmin = true;
  else if (isAdmin === "false") data.isAdmin = false;

  const isLocked = formData.get("isLocked");
  if (isLocked === "true") data.isLocked = true;
  else if (isLocked === "false") data.isLocked = false;

  const maxPlayerCount = formData.get("maxPlayerCount") as string | null;
  if (maxPlayerCount) data.maxPlayerCount = parseInt(maxPlayerCount, 10);

  const preferredLanguage = formData.get("preferredLanguage") as string | null;
  if (preferredLanguage) data.preferredLanguage = preferredLanguage;

  const resetApiToken = formData.get("resetApiToken");
  if (resetApiToken === "true") data.resetApiToken = true;

  const resetMinecraftToken = formData.get("resetMinecraftToken");
  if (resetMinecraftToken === "true") data.resetMinecraftToken = true;

  try {
    await updateUser(uuid, data);
    updateTag("users");
    return { success: true };
  } catch (e) {
    if (e instanceof DraslAPIError) {
      return { success: false, error: e.message };
    }
    throw e;
  }
}

export async function deleteUserAction(uuid: string) {
  const { getSession } = await import("@/lib/drasl/auth");
  const session = await getSession();
  if (session?.uuid === uuid) {
    return { success: false, error: "Cannot delete your own account" };
  }

  try {
    await deleteUser(uuid);
    updateTag("users");
    return { success: true };
  } catch (e) {
    if (e instanceof DraslAPIError) {
      return { success: false, error: e.message };
    }
    throw e;
  }
}

export async function lockUserAction(uuid: string) {
  const { getSession, getRole } = await import("@/lib/drasl/auth");
  const { getUser } = await import("@/lib/drasl/users");
  const { canLockUser } = await import("@/lib/permissions");
  const session = await getSession();
  if (!session) return { success: false, error: "Unauthorized" };
  const target = await getUser(uuid);
  const targetRole = getRole(target);
  if (!canLockUser(session.role, targetRole, session.uuid === uuid)) {
    return { success: false, error: "Insufficient privileges" };
  }

  try {
    await updateUser(uuid, { isLocked: true });
    updateTag("users");
    return { success: true };
  } catch (e) {
    if (e instanceof DraslAPIError) {
      return { success: false, error: e.message };
    }
    throw e;
  }
}

export async function unlockUserAction(uuid: string) {
  try {
    await updateUser(uuid, { isLocked: false });
    updateTag("users");
    return { success: true };
  } catch (e) {
    if (e instanceof DraslAPIError) {
      return { success: false, error: e.message };
    }
    throw e;
  }
}

export async function resetApiTokenAction(uuid: string) {
  try {
    const user = await updateUser(uuid, { resetApiToken: true });
    updateTag("users");
    updateTag("current-user");
    return { success: true, token: user.apiToken };
  } catch (e) {
    if (e instanceof DraslAPIError) {
      return { success: false, error: e.message };
    }
    throw e;
  }
}

export async function resetMinecraftTokenAction(uuid: string) {
  try {
    const user = await updateUser(uuid, { resetMinecraftToken: true });
    updateTag("users");
    return { success: true, token: user.minecraftToken };
  } catch (e) {
    if (e instanceof DraslAPIError) {
      return { success: false, error: e.message };
    }
    throw e;
  }
}

export async function createUserOIDCAction(uuid: string, formData: FormData) {
  const issuer = formData.get("issuer") as string;
  const subject = formData.get("subject") as string;

  if (!issuer || !subject) {
    return { success: false, error: "Issuer and subject are required" };
  }

  try {
    await createUserOIDC(uuid, { issuer, subject });
    updateTag("users");
    return { success: true };
  } catch (e) {
    if (e instanceof DraslAPIError) {
      return { success: false, error: e.message };
    }
    throw e;
  }
}

export async function deleteUserOIDCAction(uuid: string, formData: FormData) {
  const issuer = formData.get("issuer") as string;

  if (!issuer) {
    return { success: false, error: "Issuer is required" };
  }

  try {
    await deleteUserOIDC(uuid, { issuer });
    updateTag("users");
    return { success: true };
  } catch (e) {
    if (e instanceof DraslAPIError) {
      return { success: false, error: e.message };
    }
    throw e;
  }
}

export async function setAdminAction(uuid: string, isAdmin: boolean) {
  try {
    await updateUser(uuid, { isAdmin });
    updateTag("users");
    return { success: true };
  } catch (e) {
    if (e instanceof DraslAPIError) {
      return { success: false, error: e.message };
    }
    throw e;
  }
}

export interface BatchUserInput {
  username: string;
  password: string;
  maxPlayerCount?: number;
  isAdmin?: boolean;
  isLocked?: boolean;
  preferredLanguage?: string;
  createPlayer?: boolean;
}

export interface BatchResult {
  username: string;
  success: boolean;
  error?: string;
}

export interface BatchActionResult {
  uuid: string;
  success: boolean;
  error?: string;
}

export async function batchLockUsersAction(uuids: string[]): Promise<BatchActionResult[]> {
  const { getSession } = await import("@/lib/drasl/auth");
  const session = await getSession();
  const results: BatchActionResult[] = [];

  for (const uuid of uuids) {
    if (session?.uuid === uuid) {
      results.push({ uuid, success: false, error: "Cannot lock your own account" });
      continue;
    }
    try {
      await updateUser(uuid, { isLocked: true });
      results.push({ uuid, success: true });
    } catch (e) {
      const message = e instanceof DraslAPIError ? e.message : "Unknown error";
      results.push({ uuid, success: false, error: message });
    }
  }

  updateTag("users");
  return results;
}

export async function batchUnlockUsersAction(uuids: string[]): Promise<BatchActionResult[]> {
  const results: BatchActionResult[] = [];

  for (const uuid of uuids) {
    try {
      await updateUser(uuid, { isLocked: false });
      results.push({ uuid, success: true });
    } catch (e) {
      const message = e instanceof DraslAPIError ? e.message : "Unknown error";
      results.push({ uuid, success: false, error: message });
    }
  }

  updateTag("users");
  return results;
}

export async function batchDeleteUsersAction(uuids: string[]): Promise<BatchActionResult[]> {
  const { getSession } = await import("@/lib/drasl/auth");
  const session = await getSession();
  const results: BatchActionResult[] = [];

  for (const uuid of uuids) {
    if (session?.uuid === uuid) {
      results.push({ uuid, success: false, error: "Cannot delete your own account" });
      continue;
    }
    try {
      await deleteUser(uuid);
      results.push({ uuid, success: true });
    } catch (e) {
      const message = e instanceof DraslAPIError ? e.message : "Unknown error";
      results.push({ uuid, success: false, error: message });
    }
  }

  updateTag("users");
  return results;
}

export async function batchSetMaxPlayerCountAction(
  uuids: string[],
  maxPlayerCount: number,
): Promise<BatchActionResult[]> {
  const results: BatchActionResult[] = [];

  for (const uuid of uuids) {
    try {
      await updateUser(uuid, { maxPlayerCount });
      results.push({ uuid, success: true });
    } catch (e) {
      const message = e instanceof DraslAPIError ? e.message : "Unknown error";
      results.push({ uuid, success: false, error: message });
    }
  }

  updateTag("users");
  return results;
}

export async function batchResetApiTokenAction(
  uuids: string[],
): Promise<BatchActionResult[]> {
  const results: BatchActionResult[] = [];

  for (const uuid of uuids) {
    try {
      await updateUser(uuid, { resetApiToken: true });
      results.push({ uuid, success: true });
    } catch (e) {
      const message = e instanceof DraslAPIError ? e.message : "Unknown error";
      results.push({ uuid, success: false, error: message });
    }
  }

  updateTag("users");
  return results;
}

export async function batchResetMinecraftTokenAction(
  uuids: string[],
): Promise<BatchActionResult[]> {
  const results: BatchActionResult[] = [];

  for (const uuid of uuids) {
    try {
      await updateUser(uuid, { resetMinecraftToken: true });
      results.push({ uuid, success: true });
    } catch (e) {
      const message = e instanceof DraslAPIError ? e.message : "Unknown error";
      results.push({ uuid, success: false, error: message });
    }
  }

  updateTag("users");
  return results;
}

export async function batchCreateUsersAction(
  users: BatchUserInput[],
): Promise<BatchResult[]> {
  const { getSession } = await import("@/lib/drasl/auth");
  const session = await getSession();
  if (!session) return users.map(u => ({ username: u.username, success: false, error: "Unauthorized" }));

  const results: BatchResult[] = [];

  for (const input of users) {
    if (input.isAdmin && session.role !== "root") {
      results.push({ username: input.username, success: false, error: "Only root can create admin accounts" });
      continue;
    }
    const data: APICreateUserRequest = {
      username: input.username,
      password: input.password,
    };
    if (input.maxPlayerCount !== undefined) data.maxPlayerCount = input.maxPlayerCount;
    if (input.isAdmin) data.isAdmin = true;
    if (input.isLocked) data.isLocked = true;
    if (input.preferredLanguage) data.preferredLanguage = input.preferredLanguage;
    if (input.createPlayer) data.playerName = input.username;

    try {
      await createUser(data);
      results.push({ username: input.username, success: true });
    } catch (e) {
      const message = e instanceof DraslAPIError ? e.message : "Unknown error";
      results.push({ username: input.username, success: false, error: message });
    }
  }

  updateTag("users");
  updateTag("players");
  return results;
}
