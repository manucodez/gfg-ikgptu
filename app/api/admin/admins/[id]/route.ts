import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { countAdmins, deleteAdmin, updateAdminPassword } from "@/lib/content-store";
import { hashPassword } from "@/lib/password";
import { SESSION_COOKIES, verifySessionToken, type AdminSessionPayload } from "@/lib/session";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

/** The `sub` of whichever admin is making this request — "env-admin"
 *  for the legacy env-var login, or an Admin row's id otherwise. Used
 *  below to stop an admin from deleting the very account they're
 *  currently signed in as. */
async function currentAdminId(): Promise<string | null> {
  const token = cookies().get(SESSION_COOKIES.admin)?.value;
  const session = token ? await verifySessionToken<AdminSessionPayload>(token) : null;
  return session?.sub ?? null;
}

// Resets another admin's password — e.g. if they're locked out.
// Deliberately allowed for any signed-in admin against any admin id
// (including their own): the same low-friction trust model the rest
// of the admin dashboard already uses among admins, see BACKEND.md.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);
  const password = String(body?.password ?? "");

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  await updateAdminPassword(params.id, await hashPassword(password));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const selfId = await currentAdminId();
  if (selfId === params.id) {
    return NextResponse.json(
      {
        error:
          "You can't remove your own account while signed in as it — ask another admin to remove it.",
      },
      { status: 400 }
    );
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

  await deleteAdmin(params.id);
  return NextResponse.json({ ok: true });
}
