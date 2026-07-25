import { cookies } from "next/headers";
import { SESSION_COOKIES, verifySessionToken, type MemberSessionPayload } from "@/lib/session";
import { getMemberById } from "@/lib/content-store";
import type { Member } from "@/lib/types";

// Server Component / Route Handler only — this pulls in content-store's
// `fs` usage, which isn't Edge-compatible, so it must never be imported
// from middleware.ts (that's why this lives apart from lib/session.ts,
// which middleware does import).

/**
 * Returns the currently signed-in member, or null if there's no
 * valid member session or their account no longer exists.
 */
export async function getLoggedInMember(): Promise<Member | null> {
  const token = cookies().get(SESSION_COOKIES.member)?.value;
  const session = token ? await verifySessionToken<MemberSessionPayload>(token) : null;
  if (!session) return null;
  return getMemberById(session.sub);
}
