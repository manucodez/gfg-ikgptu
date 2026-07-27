import { NextResponse } from "next/server";
import { findMemberByEmail, createOtpRequest } from "@/lib/content-store";
import { generateOtp, otpExpiryDate } from "@/lib/otp";
import { hashPassword } from "@/lib/password";
import { sendOtpEmail, MailerError } from "@/lib/mailer";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Enter your registered email." }, { status: 400 });
  }

  const member = await findMemberByEmail(email);
  if (!member) {
    return NextResponse.json(
      {
        error:
          "No account found for that email. Ask a chapter admin to add it to your profile.",
      },
      { status: 404 }
    );
  }

  const code = generateOtp();
  // Reuse the same bcrypt helper used for passwords — it's a generic
  // one-way hash, and there's no reason to store the 6-digit code
  // in plain text on disk even though it's short-lived.
  const codeHash = await hashPassword(code);

  await createOtpRequest({
    email: member.socials.email!,
    memberId: member.id,
    codeHash,
    expiresAt: otpExpiryDate(10),
    attempts: 0,
  });

  try {
    await sendOtpEmail(member.socials.email!, code);
  } catch (err) {
    if (err instanceof MailerError) {
      return NextResponse.json(
        { error: "Couldn't send that email right now — please try again in a moment." },
        { status: 502 }
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
