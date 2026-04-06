import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const locales = ["en", "zh-TW"];
const defaultLocale = "zh-TW";

function getLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  if (acceptLanguage.includes("zh")) return "zh-TW";
  return "en";
}

function getSessionUser(request: NextRequest) {
  const cookie = request.cookies.get("drasl_user")?.value;
  if (!cookie) return null;
  try {
    return JSON.parse(cookie) as {
      uuid: string;
      username: string;
      isAdmin: boolean;
      role: "root" | "admin" | "user";
    };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internal paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return;
  }

  // Check if pathname has a locale
  const pathnameHasLocale = locales.some(
    (locale) =>
      pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  // Redirect to locale prefix if missing
  if (!pathnameHasLocale) {
    const locale = getLocale(request);
    request.nextUrl.pathname = `/${locale}${pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }

  // Extract locale and path after locale
  const segments = pathname.split("/");
  const locale = segments[1];
  const pathAfterLocale = "/" + segments.slice(2).join("/");

  // Public routes
  if (pathAfterLocale === "/login" || pathAfterLocale === "/") {
    return;
  }

  // Auth check
  const user = getSessionUser(request);
  if (!user) {
    request.nextUrl.pathname = `/${locale}/login`;
    return NextResponse.redirect(request.nextUrl);
  }

  // Role-based route protection
  if (pathAfterLocale.startsWith("/admin")) {
    if (user.role === "user") {
      request.nextUrl.pathname = `/${locale}/profile`;
      return NextResponse.redirect(request.nextUrl);
    }

    // Root-only route
    if (pathAfterLocale.startsWith("/admin/admins") && user.role !== "root") {
      request.nextUrl.pathname = `/${locale}/admin/users`;
      return NextResponse.redirect(request.nextUrl);
    }
  }
}

export const config = {
  matcher: ["/((?!_next|api|.*\\.).*)"],
};
