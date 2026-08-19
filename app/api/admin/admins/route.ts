import { NextResponse } from "next/server";
import { addAdmin, getAdmins, isAdminEmailTaken } from "@/lib/content-store";
import { hashPassword } from "@/lib/password";
import { isValidEmail } from "@/lib/validation";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

// Protected the same way every other /api/admin/* route is: by
// middleware.ts, purely on "is there a valid admin session cookie" —
// any signed-in admin can view and add other admins here. There's no
// separate super-admin tier; see BACKEND.md.

export async function GET() {
  const admins = await getAdmins();
  return NextResponse.json(admins);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }
  if (await isAdminEmailTaken(email)) {
    return NextResponse.json(
      { error: "An admin with that email already exists." },
      { status: 409 }
    );
  }
  // Also guard against colliding with the legacy env-var admin's
  // email — logging in with that address would otherwise be
  // ambiguous between the two (findAdminByEmail is checked first, so
  // the new row would silently win and the env-var login would stop
  // working for that address).
  const envAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (envAdminEmail && email === envAdminEmail) {
    return NextResponse.json(
      { error: "That email is already used by the fallback admin login. Choose a different one." },
      { status: 409 }
    );
  }

  const admin = await addAdmin({
    id: `adm-${Date.now().toString(36)}`,
    name,
    email,
    passwordHash: await hashPassword(password),
  });
  return NextResponse.json(admin, { status: 201 });
}
