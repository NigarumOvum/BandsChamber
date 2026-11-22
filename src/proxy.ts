import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const AUTH_PAGES = new Set(["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"]);
const PUBLIC_PREFIXES = ["/_next", "/favicon.ico"];

function isPublicPath(pathname: string) {
  if (AUTH_PAGES.has(pathname)) {
    return true;
  }

  if (pathname.startsWith("/api/auth")) {
    return true;
  }

  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Signed Better Auth session cookie — no DB round-trip in the edge proxy.
  const hasSession = Boolean(getSessionCookie(request));

  if (isPublicPath(pathname)) {
    // Auth pages decide for themselves (they run a real session lookup), so a
    // stale or revoked cookie can't bounce visitors between "/" and "/login".
    return NextResponse.next();
  }

  if (!hasSession && pathname.startsWith("/api/music")) {
    return NextResponse.json({ error: "Unauthorized", details: null }, { status: 401 });
  }

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)", "/api/music/:path*"],
};
