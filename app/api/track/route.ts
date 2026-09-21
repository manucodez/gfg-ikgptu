import { trackPageView } from "@/lib/content-store";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { trackPageViewSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

// Generous limit — this fires once per real page load, but a single
// visitor can trigger several in quick succession while navigating —
// this just needs to stop someone scripting the endpoint to inflate
// numbers or pad the pageViews table, not throttle normal browsing.
const LIMIT = 120;
const WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { ok, retryAfterSeconds } = await checkRateLimit(`track:${ip}`, LIMIT, WINDOW_MS);
  if (!ok) return rateLimitResponse(retryAfterSeconds ?? 60);

  const body = await request.json().catch(() => null);
  const parsed = trackPageViewSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid path." }, { status: 400 });
  }

  try {
    await trackPageView(parsed.data.path);
  } catch {
    // Never let a tracking failure look like anything went wrong to
    // the visitor — this endpoint is fire-and-forget by design (see
    // components/analytics/page-view-tracker.tsx).
  }

  return Response.json({ ok: true });
}
