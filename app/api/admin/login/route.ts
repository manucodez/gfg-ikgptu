import { NextResponse } from "next/server";
import { decodeEnvHash, verifyPassword } from "@/lib/password";
import {
  createAdminSessionToken,
  SESSION_COOKIES,
  type AdminSessionPayload,
} from "@/lib/session";
import { findAdminByEmail } from "@/lib/content-store";

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
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Enter your admin email and password." },
      { status: 400 }
    );
  }

  const normalizedEmail = String(email).trim().toLowerCase();

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
      });
    }
  }

  return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
}
