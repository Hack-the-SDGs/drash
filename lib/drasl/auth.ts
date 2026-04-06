import { cookies } from "next/headers";
import type {
  APILoginRequest,
  APILoginResponse,
  APIUser,
  Role,
  SessionUser,
} from "@/lib/types";
import { draslFetch, draslFetchNoAuth } from "./client";

const ROOT_USERNAME = process.env.ROOT_USERNAME ?? "";

export function getRole(user: { username: string; isAdmin: boolean }): Role {
  if (user.username === ROOT_USERNAME && user.isAdmin) return "root";
  if (user.isAdmin) return "admin";
  return "user";
}

export async function login(
  credentials: APILoginRequest,
): Promise<SessionUser> {
  const res = await draslFetchNoAuth<APILoginResponse>("/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });

  const role = getRole(res.user);
  const sessionUser: SessionUser = {
    uuid: res.user.uuid,
    username: res.user.username,
    isAdmin: res.user.isAdmin,
    role,
  };

  const cookieStore = await cookies();
  cookieStore.set("drasl_token", res.apiToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  });
  cookieStore.set("drasl_user", JSON.stringify(sessionUser), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  });

  return sessionUser;
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("drasl_token");
  cookieStore.delete("drasl_user");
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("drasl_user")?.value;
  if (!userCookie) return null;
  try {
    return JSON.parse(userCookie) as SessionUser;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<APIUser> {
  return draslFetch<APIUser>("/user", {
    tags: ["current-user"],
    revalidate: 30,
  });
}
