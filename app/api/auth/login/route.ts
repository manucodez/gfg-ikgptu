import { NextResponse } from "next/server";
import { findMemberByEmail, getCredentialForMember, addLoginEvent } from "@/lib/content-store";
import { verifyPassword } from "@/lib/password";
import { createMemberSessionToken, SESSION_COOKIES } from "@/lib/session";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Enter your registered email and password." },
      { status: 400 }
    );
  }

  const member = await findMemberByEmail(email);
  if (!member) {
    return NextResponse.json(
      {
        error:
          "No account found for that email. Ask a chapter admin to add it to your profile.",
      },
      { status: 401 }
    );
  }

  const credential = await getCredentialForMember(member.id);
  if (!credential) {
    return NextResponse.json(
      {
        error:
          "No password has been set for this account yet. Use \"Forgot / set password\" below to set one.",
      },
      { status: 401 }
    );
  }

  const valid = await verifyPassword(password, credential.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  // Fire-and-forget-ish: awaited so it's reliably recorded, but never
  // blocks or fails the actual login if something's briefly wrong with
  // it — a missed activity-log row is a minor loss, a broken login
  // over it would not be.
  await addLoginEvent(member.id, member.name, request.headers.get("user-agent") ?? undefined).catch(
    () => {}
  );

  const token = await createMemberSessionToken({
    role: "member",
    sub: member.id,
    email: member.socials.email!,
    name: member.name,
  });

  const response = NextResponse.json({ name: member.name });
  response.cookies.set(SESSION_COOKIES.member, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
