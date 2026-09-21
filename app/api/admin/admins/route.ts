import { NextResponse } from "next/server";
import { addAdmin, getAdmins, isAdminEmailTaken } from "@/lib/content-store";
import { hashPassword } from "@/lib/password";
import { isValidEmail } from "@/lib/validation";
import { getCurrentAdminSession, isOwnerSession } from "@/lib/admin-auth";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

// Protected two ways: middleware.ts already requires a valid admin
// session cookie for every /api/admin/* route (any signed-in admin
// can GET this list). Creating a new admin additionally requires the
// "owner" role below — see the comment on the Admin model in
// prisma/schema.prisma for what that distinction means.

export async function GET() {
  const admins = await getAdmins();
  return NextResponse.json(admins);
}

export async function POST(request: Request) {
  const session = await getCurrentAdminSession();
  if (!session) {
    // Shouldn't happen — middleware.ts already gates this route — but
    // fail closed rather than assume.
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const requestedRole = body?.role === "owner" ? "owner" : "admin";

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

  const existingAdmins = await getAdmins();
  // The very first database-backed admin always becomes "owner",
  // regardless of what was requested — otherwise a freshly-provisioned
  // site could end up with zero admins able to manage other admins
  // (the env-var login is always an implicit owner, but only while
  // that env var stays set).
  const role = existingAdmins.length === 0 ? "owner" : requestedRole;
  if (existingAdmins.length > 0 && !isOwnerSession(session)) {
    return NextResponse.json(
      { error: "Only an owner can add new admins." },
      { status: 403 }
    );
  }

  const admin = await addAdmin({
    id: `adm-${Date.now().toString(36)}`,
    name,
    email,
    passwordHash: await hashPassword(password),
    role,
  });
  return NextResponse.json(admin, { status: 201 });
}
