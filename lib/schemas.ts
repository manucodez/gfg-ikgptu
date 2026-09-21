import { z } from "zod";

/**
 * Schemas for the public-facing, most abuse-exposed routes: auth
 * (login, OTP), the public join form, the email-change request, and
 * the page-view beacon. Deliberately scoped to these rather than
 * every API route in the app — the admin CRUD routes (members,
 * events, gallery, stats, achievements) are already behind
 * middleware.ts's session check and have their own per-field checks
 * that already do the right thing; rewriting all of them to Zod too
 * would be a much larger, higher-risk change for comparatively little
 * marginal safety benefit on routes only a signed-in admin can reach.
 * Same for member/request-change's diff-against-current-value logic,
 * which is closely enough tied to lib/content-store.ts's
 * MemberEditableFields handling that validating it separately here
 * risked the two silently drifting apart; it keeps its existing
 * hand-rolled checks.
 *
 * Every schema below matches the *existing* validation behavior of
 * its route as closely as possible — this is a refactor for
 * consistent error shapes and centralized rules, not a behavior
 * change. Where a route's current behavior is "just needs to be a
 * non-empty string" (not a strictly valid email), the schema says
 * the same, so this doesn't newly reject anything the route used to
 * accept.
 */

export const memberLoginSchema = z.object({
  email: z.string().trim().min(1, "Enter your registered email."),
  password: z.string().min(1, "Enter your password."),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().min(1, "Enter an email."),
  password: z.string().min(1, "Enter a password."),
});

export const otpRequestSchema = z.object({
  email: z.string().trim().min(1, "Enter your registered email."),
});

export const otpVerifySchema = z.object({
  email: z.string().trim().min(1, "Enter your email."),
  code: z.string().trim().min(1, "Enter the code."),
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
});

export const requestEmailChangeSchema = z.object({
  newEmail: z.string().trim().email("Enter a valid email address."),
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
});

/** Validated after extraction from FormData (the join form includes a
 *  file field, which Zod's string/email checks don't need to see). */
export const joinRequestSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email: z.string().trim().email("Enter a valid email address."),
  branch: z.string().trim().min(1, "Branch is required."),
  year: z.string().trim().min(1, "Year is required."),
  message: z.string().trim().max(2000, "Message is too long.").optional().or(z.literal("")),
});

export const trackPageViewSchema = z.object({
  path: z
    .string()
    .min(1)
    .max(200)
    .refine((p) => p.startsWith("/"), "Invalid path."),
});

/** Formats a Zod validation failure the same way this app's routes
 *  already report errors elsewhere: a single `{ error: string }`
 *  body, using the first issue's message (the routes above only ever
 *  show one error at a time in their UI, so surfacing every issue at
 *  once would be a UI change with nothing on the frontend to display
 *  it). Typed structurally rather than against Zod's own
 *  SafeParse-result type name, which isn't part of the package's
 *  public type exports and has moved between Zod major versions. */
export function firstZodError(result: { success: boolean; error?: { issues: { message: string }[] } }): string {
  if (result.success || !result.error) return "";
  return result.error.issues[0]?.message ?? "Invalid request.";
}
