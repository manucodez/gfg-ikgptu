import { NextResponse } from "next/server";
import { countAdmins, countOtherOwners, deleteAdmin, getAdmins, updateAdminPassword, updateAdminRole } from "@/lib/content-store";
import { hashPassword } from "@/lib/password";
import { getCurrentAdminSession, isOwnerSession } from "@/lib/admin-auth";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

// Resets another admin's password and/or changes their role.
// Password resets stay open to any signed-in admin against any admin
// id (including their own) — the same low-friction trust model the
// rest of the admin dashboard already uses among admins, see
// BACKEND.md. Role changes are restricted to "owner" admins below,
// since that's the one action that controls who else can manage
// admin accounts at all.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const hasPassword = typeof body?.password === "string" && body.password.length > 0;
  const hasRole = body?.role === "owner" || body?.role === "admin";

  if (!hasPassword && !hasRole) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  if (hasRole) {
    if (!isOwnerSession(session)) {
      return NextResponse.json({ error: "Only an owner can change admin roles." }, { status: 403 });
    }
    if (body.role === "admin") {
      // Don't let the last owner demote themselves (or be demoted) —
      // that would leave no one able to manage admin accounts once
      // the env-var fallback login is ever disabled.
      const otherOwners = await countOtherOwners(params.id);
      if (otherOwners === 0) {
        return NextResponse.json(
          { error: "Can't demote the last owner — promote another admin to owner first." },
          { status: 400 }
        );
      }
    }
    const updated = await updateAdminRole(params.id, body.role);
    if (!updated) {
      return NextResponse.json({ error: "Admin not found." }, { status: 404 });
    }
  }

  if (hasPassword) {
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }
    await updateAdminPassword(params.id, await hashPassword(body.password));
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (session.sub === params.id) {
    return NextResponse.json(
      {
        error:
          "You can't remove your own account while signed in as it — ask another admin to remove it.",
      },
      { status: 400 }
    );
  }
  if (!isOwnerSession(session)) {
    return NextResponse.json({ error: "Only an owner can remove admin accounts." }, { status: 403 });
  }

  // Always keep at least one database-backed admin once one exists,
  // rather than leaving the site depending entirely on the env-var
  // fallback login going forward.
  const total = await countAdmins();
  if (total <= 1) {
    return NextResponse.json(
      { error: "Can't remove the last admin account." },
      { status: 400 }
    );
  }

  // Nor the last owner — otherwise the remaining admins could be
  // stuck unable to manage admin accounts at all.
  const target = (await getAdmins()).find((a) => a.id === params.id);
  if (target?.role === "owner") {
    const otherOwners = await countOtherOwners(params.id);
    if (otherOwners === 0) {
      return NextResponse.json(
        { error: "Can't remove the last owner — promote another admin to owner first." },
        { status: 400 }
      );
    }
  }

  await deleteAdmin(params.id);
  return NextResponse.json({ ok: true });
}
