import { draslFetch } from "./client";
import type {
  APIUser,
  APICreateUserRequest,
  APICreateUserResponse,
  APIUpdateUserRequest,
  APICreateOIDCIdentityRequest,
  APIDeleteOIDCIdentityRequest,
  APIOIDCIdentity,
} from "@/lib/types";

export function getUsers() {
  return draslFetch<APIUser[]>("/users", {
    tags: ["users"],
    revalidate: 30,
  });
}

export function getUser(uuid: string) {
  return draslFetch<APIUser>(`/users/${uuid}`, {
    tags: ["users", `user-${uuid}`],
    revalidate: 30,
  });
}

export function createUser(data: APICreateUserRequest) {
  return draslFetch<APICreateUserResponse>("/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateUser(uuid: string, data: APIUpdateUserRequest) {
  return draslFetch<APIUser>(`/users/${uuid}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteUser(uuid: string) {
  return draslFetch<void>(`/users/${uuid}`, {
    method: "DELETE",
  });
}

export function createUserOIDC(
  uuid: string,
  data: APICreateOIDCIdentityRequest,
) {
  return draslFetch<APIOIDCIdentity>(`/users/${uuid}/oidc-identities`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteUserOIDC(
  uuid: string,
  data: APIDeleteOIDCIdentityRequest,
) {
  return draslFetch<void>(`/users/${uuid}/oidc-identities`, {
    method: "DELETE",
    body: JSON.stringify(data),
  });
}
