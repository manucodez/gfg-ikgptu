import { NextResponse } from "next/server";
import { decodeEnvHash, verifyPassword } from "@/lib/password";
import { createAdminSessionToken, SESSION_COOKIES } from "@/lib/session";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminHashB64 = process.env.ADMIN_PASSWORD_HASH_B64;

  if (!adminEmail || !adminHashB64) {
    return NextResponse.json(
      {
        error:
          "Admin login isn't configured — set ADMIN_EMAIL and ADMIN_PASSWORD_HASH_B64 in .env.local.",
      },
      { status: 500 }
    );
  }

  if (!email || !password || String(email).toLowerCase() !== adminEmail.toLowerCase()) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const adminHash = decodeEnvHash(adminHashB64);
  const valid = await verifyPassword(password, adminHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  const token = await createAdminSessionToken({
    role: "admin",
    sub: "admin",
    email: adminEmail,
  });

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
