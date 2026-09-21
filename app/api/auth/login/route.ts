import { NextResponse } from "next/server";
import { findMemberByEmail, getCredentialForMember, addLoginEvent } from "@/lib/content-store";
import { verifyPassword } from "@/lib/password";
import { createMemberSessionToken, SESSION_COOKIES } from "@/lib/session";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { memberLoginSchema, firstZodError } from "@/lib/schemas";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

// Generic message for every failure case below (no such member, no
// password set yet, wrong password) — on purpose. Returning a
// different message per case lets anyone learn which emails belong to
// real members just by trying them, without ever needing a correct
// password. See the (identical, pre-existing) pattern in
// app/api/admin/login/route.ts.
const GENERIC_ERROR =
  'Incorrect email or password. If you haven\'t set a password yet, use "Forgot / set password" below.';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = memberLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed) }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const ip = getClientIp(request);
  const normalizedEmail = email.trim().toLowerCase();
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit(`login:ip:${ip}`, 20, 15 * 60_000),
    checkRateLimit(`login:email:${normalizedEmail}`, 8, 15 * 60_000),
  ]);
  if (!ipLimit.ok || !emailLimit.ok) {
    return rateLimitResponse(Math.max(ipLimit.retryAfterSeconds ?? 0, emailLimit.retryAfterSeconds ?? 0));
  }

  const member = await findMemberByEmail(email);
  if (!member) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const credential = await getCredentialForMember(member.id);
  if (!credential) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const valid = await verifyPassword(password, credential.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
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
