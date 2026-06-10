import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_PREFIX } from "@/lib/auth-options";

function loginUrl(request: NextRequest) {
  const url = new URL("/login", request.url);
  url.searchParams.set("callbackUrl", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return url;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(getSessionCookie(request, { cookiePrefix: AUTH_COOKIE_PREFIX }));

  if (pathname.startsWith("/dashboard") && !hasSessionCookie) {
    return NextResponse.redirect(loginUrl(request));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
