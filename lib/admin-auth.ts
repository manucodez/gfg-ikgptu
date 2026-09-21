import { cookies } from "next/headers";
import { SESSION_COOKIES, verifySessionToken, type AdminSessionPayload } from "@/lib/session";

/**
 * The signed-in admin's session, or null. middleware.ts already
 * guarantees every /api/admin/** request has a valid admin session
 * before the route handler even runs — this is for routes (like
 * admin management below) that additionally need to know *which*
 * admin, and what role they hold, rather than just "some admin".
 */
export async function getCurrentAdminSession(): Promise<AdminSessionPayload | null> {
  const token = cookies().get(SESSION_COOKIES.admin)?.value;
  return token ? verifySessionToken<AdminSessionPayload>(token) : null;
}

/**
 * True for the legacy env-var bootstrap login (session.sub ===
 * "env-admin") or any database-backed admin whose role is "owner".
 * The env-var login is always treated as "owner" in code, without
 * needing a row in the admins table for it — see the comment on the
 * Admin model in prisma/schema.prisma.
 */
export function isOwnerSession(session: AdminSessionPayload | null): boolean {
  if (!session) return false;
  if (session.sub === "env-admin") return true;
  return session.adminRole === "owner";
}
