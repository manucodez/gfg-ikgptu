import { pruneOldLoginEvents, pruneExpiredOtpRequests } from "@/lib/content-store";

export const dynamic = "force-dynamic";

/**
 * Meant to be hit on a schedule (see vercel.json's `crons` entry,
 * which calls this once a day) rather than by a person — deletes
 * login-activity rows older than 90 days and any OTP request past its
 * expiry that was never cleaned up when it was used or superseded.
 * Neither table is exposed anywhere else for an admin to prune by
 * hand, so without this they'd just grow forever.
 *
 * Protected by a shared secret rather than an admin session cookie,
 * since Vercel Cron calls this directly with no browser/cookie
 * involved. Set CRON_SECRET in your environment and Vercel will send
 * it automatically as this bearer token for cron-triggered requests;
 * without CRON_SECRET set, this route refuses every request rather
 * than running unauthenticated.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { error: "CRON_SECRET isn't configured — refusing to run without one." },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [loginEventsRemoved, otpRequestsRemoved] = await Promise.all([
    pruneOldLoginEvents(90),
    pruneExpiredOtpRequests(),
  ]);

  return Response.json({ ok: true, loginEventsRemoved, otpRequestsRemoved });
}
