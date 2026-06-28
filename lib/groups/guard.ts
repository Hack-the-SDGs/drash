import "server-only";
import { getSession } from "@/lib/drasl/auth";

/**
 * KV writes are not protected by the Drasl API, so group/topic actions must
 * gate themselves. Returns an error message if the caller is not admin/root.
 */
export async function requireAdmin(): Promise<string | null> {
  const session = await getSession();
  if (!session || (session.role !== "admin" && session.role !== "root")) {
    return "沒有權限";
  }
  return null;
}
