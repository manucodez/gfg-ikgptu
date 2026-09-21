import { NextResponse } from "next/server";
import { findMemberByEmail, createOtpRequest } from "@/lib/content-store";
import { generateOtp, otpExpiryDate } from "@/lib/otp";
import { hashPassword } from "@/lib/password";
import { sendOtpEmail, MailerError } from "@/lib/mailer";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { otpRequestSchema, firstZodError } from "@/lib/schemas";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = otpRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed) }, { status: 400 });
  }
  const { email } = parsed.data;

  const normalizedEmail = email.trim().toLowerCase();
  const ip = getClientIp(request);
  // Tight per-email limit: a code is only useful for 10 minutes and a
  // real member never needs more than a couple in that window. The
  // per-IP limit is a bit looser to allow for shared campus networks,
  // but still low enough to make email-bombing a specific inbox
  // impractical from a single source.
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit(`otp-request:ip:${ip}`, 10, 60 * 60_000),
    checkRateLimit(`otp-request:email:${normalizedEmail}`, 3, 10 * 60_000),
  ]);
  if (!ipLimit.ok || !emailLimit.ok) {
    return rateLimitResponse(Math.max(ipLimit.retryAfterSeconds ?? 0, emailLimit.retryAfterSeconds ?? 0));
  }

  const member = await findMemberByEmail(email);
  // Deliberately the same response whether or not an account exists —
  // returning a distinct "no account found" here would let anyone
  // discover which emails belong to real members just by trying them.
  // If there's no matching member, this silently does nothing further
  // and the person just never receives a code (and, per the frontend
  // in app/reset-password/page.tsx, still moves on to the "enter your
  // code" step either way).
  if (!member) {
    return NextResponse.json({ ok: true });
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
