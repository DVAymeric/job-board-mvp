import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";

const PROTECTED_PREFIXES = ["/board", "/archives", "/analytics", "/account"];

const authGuard = auth((req) => {
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    req.nextUrl.pathname.startsWith(prefix)
  );
  if (isProtected && !req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

/**
 * Only GET (page navigation) needs the login redirect. A POST to a
 * protected path is a Server Action call (e.g. a `<form action={...}>` on
 * `/board` submits to `/board`) — already protected by its own
 * `requireUser()` check — never something we want to redirect. Running the
 * `auth()` wrapper on it anyway triggers Auth.js's session-cookie refresh
 * side effect, which can race with a same-request `signOut()`'s own cookie
 * deletion (both write `Set-Cookie: authjs.session-token=...` on the same
 * response) and, under load, resurrect a session that was supposed to end
 * (JOB-131 — confirmed via network trace: logoutAction's response carried
 * both a refreshed token and the deletion, order-dependent).
 */
export function proxy(req: NextRequest, event: Parameters<typeof authGuard>[1]) {
  if (req.method !== "GET") {
    return NextResponse.next();
  }
  return authGuard(req, event);
}

export const config = {
  matcher: ["/board/:path*", "/archives/:path*", "/analytics/:path*", "/account/:path*"],
};
