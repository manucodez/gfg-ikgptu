import { NextResponse } from "next/server";
import {
  getOtpRequestForEmail,
  incrementOtpAttempts,
  deleteOtpRequestForEmail,
  findMemberByEmail,
  setCredentialForMember,
} from "@/lib/content-store";
import { isOtpExpired, MAX_OTP_ATTEMPTS } from "@/lib/otp";
import { hashPassword, verifyPassword } from "@/lib/password";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { email, code, newPassword } = await request.json();

  if (!email || !code || !newPassword) {
    return NextResponse.json(
      { error: "Enter the code and a new password." },
      { status: 400 }
    );
  }
  if (String(newPassword).length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const otpRequest = await getOtpRequestForEmail(email);
  if (!otpRequest) {
    return NextResponse.json(
      { error: "Request a new code — none is pending for that email." },
      { status: 400 }
    );
  }
  if (isOtpExpired(otpRequest.expiresAt)) {
    await deleteOtpRequestForEmail(email);
    return NextResponse.json(
      { error: "That code expired. Request a new one." },
      { status: 400 }
    );
  }
  if (otpRequest.attempts >= MAX_OTP_ATTEMPTS) {
    await deleteOtpRequestForEmail(email);
    return NextResponse.json(
      { error: "Too many incorrect attempts. Request a new code." },
      { status: 429 }
    );
  }

  const codeValid = await verifyPassword(String(code), otpRequest.codeHash);
  if (!codeValid) {
    await incrementOtpAttempts(email);
    return NextResponse.json({ error: "Incorrect code." }, { status: 401 });
  }

  const member = await findMemberByEmail(email);
  if (!member) {
    await deleteOtpRequestForEmail(email);
    return NextResponse.json({ error: "Account no longer exists." }, { status: 404 });
  }

  const passwordHash = await hashPassword(newPassword);
  await setCredentialForMember(member.id, passwordHash);
  await deleteOtpRequestForEmail(email);

  return NextResponse.json({ ok: true });
}
