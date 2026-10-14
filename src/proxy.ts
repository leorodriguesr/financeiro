import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readClaims, SESSION_COOKIE, sessionCookieOptions, sessionNeedsRenewal, signSession } from "@/lib/session";

const PUBLIC_FILE = /^\/(?:sw\.js|manifest\.webmanifest|apple-icon|icons\/|icon)/;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/sair" || PUBLIC_FILE.test(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await readClaims(token) : null;

  if (pathname === "/login") {
    if (!claims) return NextResponse.next();
    return renew(NextResponse.redirect(new URL("/", request.url)), claims);
  }

  if (!claims) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return renew(NextResponse.next(), claims);
}

async function renew(response: NextResponse, claims: { userId: string; expiresAt: number }) {
  if (!sessionNeedsRenewal(claims.expiresAt)) return response;
  response.cookies.set(SESSION_COOKIE, await signSession(claims.userId), sessionCookieOptions());
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
