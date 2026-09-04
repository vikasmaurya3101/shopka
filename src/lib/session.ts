import { cookies } from "next/headers";
import { SignJWT, jwtVerify, JWTPayload } from "jose";

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET
);

const COOKIE_NAME = "shopka_session";
const SESSION_DAYS = 30;

/** Exported so middleware can read the same cookie without duplicating the name. */
export const SESSION_COOKIE_NAME = COOKIE_NAME;


export interface SessionPayload extends JWTPayload {
  userId: string;
  phone: string | null;
  role: "CUSTOMER" | "SELLER" | "ADMIN";
}

export async function createSession(
  payload: SessionPayload
) {
  const token = await new SignJWT({
    userId: payload.userId,
    phone: payload.phone,
    role: payload.role,
  })
    .setProtectedHeader({
      alg: "HS256",
    })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret);

  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function getSession() {
  const cookieStore = await cookies();

  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

/**
 * Verifies a raw session token, for callers that can't use `cookies()`.
 *
 * Middleware runs on the edge runtime where `next/headers` isn't available, so
 * it reads the cookie off the request and hands the string here instead. `jose`
 * is used rather than `jsonwebtoken` precisely because it works in that runtime.
 */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}

export async function destroySession() {
  const cookieStore = await cookies();

  cookieStore.delete(COOKIE_NAME);
}