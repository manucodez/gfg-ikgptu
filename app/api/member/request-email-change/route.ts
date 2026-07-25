import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getMemberById,
  addChangeRequest,
  deletePendingRequestForMember,
  isEmailTakenByAnotherMember,
} from "@/lib/content-store";
import { hashPassword } from "@/lib/password";
import { SESSION_COOKIES, verifySessionToken, type MemberSessionPayload } from "@/lib/session";
import { isValidEmail } from "@/lib/validation";
import type { MemberChangeRequest } from "@/lib/types";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

async function getCurrentMember() {
  const token = cookies().get(SESSION_COOKIES.member)?.value;
  const session = token ? await verifySessionToken<MemberSessionPayload>(token) : null;
  if (!session) return null;
  return getMemberById(session.sub);
}

/**
 * A member proposes a new login email + a new password for it. Both
 * are required together (a bare email change with no password would
 * leave the account's credential mismatched with what the member
 * actually knows), and — like every other profile change in this
 * app — nothing takes effect until an admin approves it. The password
 * is hashed immediately; only the hash is ever written to disk, here
 * or after approval.
 */
export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const newEmail = String(body?.newEmail ?? "").trim();
  const newPassword = String(body?.newPassword ?? "");

  if (!isValidEmail(newEmail)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const currentEmail = member.socials.email ?? "";
  if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
    return NextResponse.json(
      { error: "That's already your registered email." },
      { status: 400 }
    );
  }
  if (await isEmailTakenByAnotherMember(newEmail, member.id)) {
    return NextResponse.json(
      { error: "Another member is already registered with that email." },
      { status: 409 }
    );
  }

  const changeRequest: MemberChangeRequest = {
    id: `req-${Date.now().toString(36)}`,
    memberId: member.id,
    memberName: member.name,
    submittedAt: new Date().toISOString(),
    status: "pending",
    kind: "email",
    changes: {},
    previous: {},
    emailChange: {
      previousEmail: currentEmail,
      newEmail,
      passwordHash: await hashPassword(newPassword),
    },
  };

  await addChangeRequest(changeRequest);
  return NextResponse.json(
    { ...changeRequest, emailChange: { previousEmail: currentEmail, newEmail } },
    { status: 201 }
  );
}

export async function DELETE() {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  await deletePendingRequestForMember(member.id, "email");
  return NextResponse.json({ ok: true });
}
