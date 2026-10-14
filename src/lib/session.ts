import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "casa_session";

/** Chrome limita o cookie a 400 dias. Cada visita renova antes disso. */
const SESSION_MAX_AGE = 60 * 60 * 24 * 400;
const SESSION_REFRESH_AFTER = 60 * 60 * 24;

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error("Defina AUTH_SECRET no arquivo .env.local.");
  }
  return new TextEncoder().encode(value);
}

export async function signSession(userId: string) {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("400d")
    .sign(secret());
}

export async function readClaims(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.sub !== "string") return null;
    return { userId: payload.sub, expiresAt: payload.exp ?? 0 };
  } catch {
    return null;
  }
}

export async function readSession(token: string) {
  const claims = await readClaims(token);
  return claims?.userId ?? null;
}

export function sessionNeedsRenewal(expiresAt: number) {
  const remaining = expiresAt - Math.floor(Date.now() / 1000);
  return remaining < SESSION_MAX_AGE - SESSION_REFRESH_AFTER;
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
    expires: maxAge > 0 ? new Date(Date.now() + maxAge * 1000) : new Date(0),
  };
}
