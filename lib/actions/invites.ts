"use server";

import { updateTag } from "next/cache";
import { createInvite, deleteInvite } from "@/lib/drasl/invites";
import { DraslAPIError } from "@/lib/drasl/client";

export async function createInviteAction() {
  try {
    await createInvite();
    updateTag("invites");
    return { success: true };
  } catch (e) {
    if (e instanceof DraslAPIError) {
      return { success: false, error: e.message };
    }
    throw e;
  }
}

export async function deleteInviteAction(code: string) {
  if (!code) {
    return { success: false, error: "Invite code is required" };
  }

  try {
    await deleteInvite(code);
    updateTag("invites");
    return { success: true };
  } catch (e) {
    if (e instanceof DraslAPIError) {
      return { success: false, error: e.message };
    }
    throw e;
  }
}
