import { SignJWT, jwtVerify } from "jose";

// Session handling shared by API routes (Node runtime) and
// middleware.ts (Edge runtime) — this file only touches `jose`,
// which runs in both, so it's safe to import from either.
// Password hashing (bcryptjs, Node-only) lives in lib/password.ts
// and is never imported here or from middleware.

const MEMBER_COOKIE = "gfg_session";
const ADMIN_COOKIE = "gfg_admin_session";

const MEMBER_SESSION_TTL = "7d";
const ADMIN_SESSION_TTL = "1d";

export const SESSION_COOKIES = {
  member: MEMBER_COOKIE,
  admin: ADMIN_COOKIE,
};

export interface MemberSessionPayload {
  role: "member";
  sub: string;
  email: string;
  name: string;
}

export interface AdminSessionPayload {
  role: "admin";
  sub: string;
  email: string;
}

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not set. Copy .env.local.example to .env.local and fill it in."
    );
  }
  return new TextEncoder().encode(secret);
}

async function signSession(
  payload: MemberSessionPayload | AdminSessionPayload,
  ttl: string
) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(getSecretKey());
}

export async function createMemberSessionToken(payload: MemberSessionPayload) {
  return signSession(payload, MEMBER_SESSION_TTL);
}

export async function createAdminSessionToken(payload: AdminSessionPayload) {
  return signSession(payload, ADMIN_SESSION_TTL);
}

export async function verifySessionToken<
  T extends MemberSessionPayload | AdminSessionPayload
>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as unknown as T;
  } catch {
    // Expired, tampered, or malformed — treat the same as "not logged in".
    return null;
  }
}
