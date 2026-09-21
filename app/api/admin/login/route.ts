import { NextResponse } from "next/server";
import { decodeEnvHash, verifyPassword } from "@/lib/password";
import {
  createAdminSessionToken,
  SESSION_COOKIES,
  type AdminSessionPayload,
} from "@/lib/session";
import { findAdminByEmail } from "@/lib/content-store";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { adminLoginSchema, firstZodError } from "@/lib/schemas";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

async function respondWithSession(payload: AdminSessionPayload) {
  const token = await createAdminSessionToken(payload);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIES.admin, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
  return response;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed) }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const normalizedEmail = email.trim().toLowerCase();

  // Stricter than the member login limit — an admin account is a much
  // higher-value target, and there are far fewer legitimate admins
  // sharing an IP than there are members sharing a campus network.
  const ip = getClientIp(request);
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit(`admin-login:ip:${ip}`, 10, 15 * 60_000),
    checkRateLimit(`admin-login:email:${normalizedEmail}`, 5, 15 * 60_000),
  ]);
  if (!ipLimit.ok || !emailLimit.ok) {
    return rateLimitResponse(Math.max(ipLimit.retryAfterSeconds ?? 0, emailLimit.retryAfterSeconds ?? 0));
  }

  // Database-backed admin accounts — created from the dashboard's
  // Admins tab. This is checked first since it's where every admin
  // *except* the original bootstrap one ends up living.
  const admin = await findAdminByEmail(normalizedEmail);
  if (admin) {
    const valid = await verifyPassword(password, admin.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    return respondWithSession({
      role: "admin",
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      adminRole: admin.role,
    });
  }

  // Legacy single-admin login, from env vars. Kept as a fallback (not
  // replaced) so this still works for: signing in for the very first
  // time, before any row exists in the Admin table, to then create
  // real admin accounts from the dashboard; and as a break-glass login
  // if the database is ever unreachable. It's fine to keep relying on
  // this alongside database-backed admins, or to eventually stop
  // setting these env vars once every admin has their own account.
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminHashB64 = process.env.ADMIN_PASSWORD_HASH_B64;
  if (adminEmail && adminHashB64 && normalizedEmail === adminEmail.toLowerCase()) {
    const valid = await verifyPassword(password, decodeEnvHash(adminHashB64));
    if (valid) {
      return respondWithSession({
        role: "admin",
        sub: "env-admin",
        email: adminEmail,
        name: "Admin",
        adminRole: "owner",
      });
    }
  }

  return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
}
