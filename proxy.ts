import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PROTECTED_PREFIXES = ["/board", "/archives", "/analytics", "/account"];

export const proxy = auth((req) => {
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    req.nextUrl.pathname.startsWith(prefix)
  );
  if (isProtected && !req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/board/:path*", "/archives/:path*", "/analytics/:path*", "/account/:path*"],
};
