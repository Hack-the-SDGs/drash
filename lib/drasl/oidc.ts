import { draslFetch } from "./client";
import type {
  APICreateOIDCIdentityRequest,
  APIDeleteOIDCIdentityRequest,
  APIOIDCIdentity,
} from "@/lib/types";

export function createOIDCIdentity(data: APICreateOIDCIdentityRequest) {
  return draslFetch<APIOIDCIdentity>("/user/oidc-identities", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteOIDCIdentity(data: APIDeleteOIDCIdentityRequest) {
  return draslFetch<void>("/user/oidc-identities", {
    method: "DELETE",
    body: JSON.stringify(data),
  });
}
