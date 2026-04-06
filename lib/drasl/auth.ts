import { cookies } from "next/headers";
import type {
  APILoginRequest,
  APILoginResponse,
  APIUser,
  Role,
  SessionUser,
} from "@/lib/types";
import { draslFetch, draslFetchNoAuth, DRASL_BASE_URL } from "./client";

export function getRole(user: { username: string; isAdmin: boolean }): Role {
  const rootUsername = process.env.ROOT_USERNAME ?? "";
  if (rootUsername && user.username === rootUsername && user.isAdmin) return "root";
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

  // Also login to Drasl web UI so we can scrape tokens later
  const browserToken = await webLogin(credentials);
  if (browserToken) {
    cookieStore.set("drasl_browser_token", browserToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
    });
  }

  return sessionUser;
}

/**
 * Login to Drasl web UI and return the browserToken cookie value.
 */
async function webLogin(
  credentials: APILoginRequest,
): Promise<string | undefined> {
  try {
    const body = new URLSearchParams({
      username: credentials.username,
      password: credentials.password,
    });
    const res = await fetch(`${DRASL_BASE_URL}/web/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      redirect: "manual",
    });
    const setCookies = res.headers.getSetCookie();
    for (const c of setCookies) {
      const match = c.match(/__Host-browserToken=([^;]+)/);
      if (match && match[1]) return match[1];
    }
  } catch {
    // Non-critical — tokens just won't be displayed
  }
  return undefined;
}

/**
 * Scrape token values from the Drasl web UI for a given user.
 * Returns { apiToken, minecraftToken } or empty strings if unavailable.
 */
export async function scrapeUserTokens(
  userUuid: string,
): Promise<{ apiToken: string; minecraftToken: string }> {
  const result = { apiToken: "", minecraftToken: "" };
  try {
    const cookieStore = await cookies();
    const browserToken = cookieStore.get("drasl_browser_token")?.value;
    if (!browserToken) return result;

    const res = await fetch(`${DRASL_BASE_URL}/web/user/${userUuid}`, {
      headers: {
        Cookie: `__Host-browserToken=${browserToken}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return result;

    const html = await res.text();
    const apiMatch = html.match(
      /id="api-token"[^>]*readonly[^>]*value="([^"]*)"/,
    );
    if (apiMatch) result.apiToken = apiMatch[1];

    const mcMatch = html.match(
      /id="minecraft-token"[^>]*readonly[^>]*value="([^"]*)"/,
    );
    if (mcMatch) result.minecraftToken = mcMatch[1];
  } catch {
    // Non-critical
  }
  return result;
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("drasl_token");
  cookieStore.delete("drasl_user");
  cookieStore.delete("drasl_browser_token");
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("drasl_user")?.value;
  if (!userCookie) return null;
  try {
    const session = JSON.parse(userCookie) as SessionUser;
    // Recompute role dynamically so ROOT_USERNAME changes take effect
    // without requiring re-login
    session.role = getRole(session);
    return session;
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
