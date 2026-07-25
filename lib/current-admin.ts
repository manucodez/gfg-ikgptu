import { cookies } from "next/headers";
import { SESSION_COOKIES, verifySessionToken, type AdminSessionPayload } from "@/lib/session";

// Server Component only. Lets a public page (e.g. app/page.tsx) know
// whether the visitor is a signed-in admin, so it can render
// admin-only affordances without a separate client-side auth check.
// Purely a UI convenience: every admin API route is still
// independently protected by middleware.ts regardless of what the
// client renders. Not currently called anywhere, since the one
// admin-only affordance that used it (an inline "edit registration
// link" control on the public event card) was removed in favor of
// managing events entirely through the /admin dashboard.

export async function isAdminLoggedIn(): Promise<boolean> {
  const token = cookies().get(SESSION_COOKIES.admin)?.value;
  const session = token ? await verifySessionToken<AdminSessionPayload>(token) : null;
  return !!session && session.role === "admin";
}
