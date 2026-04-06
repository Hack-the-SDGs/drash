import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { APIError } from "@/lib/types";

const DRASL_API_URL = process.env.DRASL_API_URL ?? "https://drasl.ntust.camp";
const API_BASE = `${DRASL_API_URL}/drasl/api/v2`;

export class DraslAPIError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "DraslAPIError";
  }
}

async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("drasl_token")?.value;
}

export async function draslFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (res.status === 401) {
    const cookieStore = await cookies();
    cookieStore.delete("drasl_token");
    cookieStore.delete("drasl_user");
    redirect("/login");
  }

  if (!res.ok) {
    let message = `API error: ${res.status}`;
    try {
      const error: APIError = await res.json();
      message = error.message;
    } catch {}
    throw new DraslAPIError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export async function draslFetchNoAuth<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `API error: ${res.status}`;
    try {
      const error: APIError = await res.json();
      message = error.message;
    } catch {}
    throw new DraslAPIError(res.status, message);
  }

  return res.json();
}
