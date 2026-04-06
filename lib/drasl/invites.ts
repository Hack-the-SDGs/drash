import { draslFetch } from "./client";
import type { APIInvite } from "@/lib/types";

export function getInvites() {
  return draslFetch<APIInvite[]>("/invites", {
    tags: ["invites"],
    revalidate: 30,
  });
}

export function createInvite() {
  return draslFetch<APIInvite>("/invites", {
    method: "POST",
  });
}

export function deleteInvite(code: string) {
  return draslFetch<void>(`/invites/${code}`, {
    method: "DELETE",
  });
}
