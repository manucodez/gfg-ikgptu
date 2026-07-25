import { NextResponse } from "next/server";
import { getCredentialStatuses } from "@/lib/content-store";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

/**
 * Password status for every member, keyed by memberId — whether
 * they have one set, and when it was last changed. Passwords are
 * bcrypt-hashed one-way (lib/password.ts); there is no "current
 * password" to read back for anyone, admin included, so this is
 * deliberately the most this endpoint (or the admin UI) can ever
 * show. To help someone who's locked out, use the existing "set a
 * new password" field on their member form instead.
 */
export async function GET() {
  const statuses = await getCredentialStatuses();
  return NextResponse.json(statuses);
}
