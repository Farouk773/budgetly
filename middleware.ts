import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/backend/session-cookie";

// Defense-in-depth only: a coarse "session cookie present?" gate in front of
// every API route (except auth) so a future route that forgets to call
// `getCurrentUser()` still fails closed with 401 instead of silently
// succeeding. This does NOT replace `getCurrentUser()` — the Edge runtime
// can't reliably hit Postgres for the real sha256 token lookup, so each
// route still owns the actual authentication/ownership checks. See
// SECURITY_AUDIT_PLAN.md section 6, point 2.
export const config = {
  matcher: ["/api/:path*"],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth routes manage their own (lack of) authentication requirement:
  // login/signup must be reachable without a session, and logout must be a
  // safe no-op even when the cookie is already missing/expired.
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);
  if (!hasSessionCookie) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  return NextResponse.next();
}
