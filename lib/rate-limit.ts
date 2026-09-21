/**
 * Rate limiting for the public-facing write endpoints (login, admin
 * login, OTP request, join, page-view tracking) — none of them had
 * any limit before, which made them brute-forceable / spammable.
 *
 * Two modes, chosen automatically:
 *
 *  - If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set,
 *    this uses Upstash's REST API directly (a couple of plain fetch
 *    calls — no SDK dependency) so limits are shared correctly across
 *    every serverless instance. This is what you want in production
 *    on Vercel, where each request can land on a different instance
 *    with its own memory.
 *  - Otherwise, an in-memory sliding window per process. This is
 *    enough for local development and for a single long-running Node
 *    server, but on serverless platforms *without* Upstash configured
 *    each instance keeps its own counters — still meaningfully raises
 *    the bar over no rate limiting at all, just not a hard global
 *    guarantee. The in-memory store is capped and self-pruning so it
 *    can never grow into a memory leak.
 *
 * Both modes are exercised by lib/rate-limit.test.ts.
 */

interface RateLimitResult {
  ok: boolean;
  /** Seconds until the caller should retry, only set when ok is false. */
  retryAfterSeconds?: number;
}

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// --- In-memory fallback -----------------------------------------------

interface Bucket {
  count: number;
  windowStart: number;
}

const memoryStore = new Map<string, Bucket>();
// Hard cap so a burst of distinct keys (e.g. many different IPs
// hitting a public route) can never grow this into an unbounded
// memory leak on a long-running server — the oldest entries are
// pruned first once the cap is hit.
const MAX_MEMORY_KEYS = 50_000;

function checkMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || now - existing.windowStart >= windowMs) {
    if (memoryStore.size >= MAX_MEMORY_KEYS) {
      const oldestKey = memoryStore.keys().next().value;
      if (oldestKey !== undefined) memoryStore.delete(oldestKey);
    }
    memoryStore.set(key, { count: 1, windowStart: now });
    return { ok: true };
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.ceil((existing.windowStart + windowMs - now) / 1000);
    return { ok: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
  }

  existing.count += 1;
  return { ok: true };
}

// --- Upstash Redis REST mode --------------------------------------------

async function checkUpstash(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const windowSeconds = Math.max(1, Math.round(windowMs / 1000));
  // INCR then, only on the first hit in this window, set an expiry —
  // a standard fixed-window counter done in two REST calls (Upstash's
  // REST API doesn't support Lua scripting on the free tier, so this
  // stays deliberately simple rather than reaching for atomicity this
  // endpoint doesn't need: worst case under a race is the window
  // resets a few requests late, not a security-relevant gap).
  const incrRes = await fetch(`${upstashUrl}/incr/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${upstashToken}` },
  });
  if (!incrRes.ok) throw new Error(`Upstash INCR failed: ${incrRes.status}`);
  const { result: count } = (await incrRes.json()) as { result: number };

  if (count === 1) {
    await fetch(`${upstashUrl}/expire/${encodeURIComponent(key)}/${windowSeconds}`, {
      headers: { Authorization: `Bearer ${upstashToken}` },
    }).catch(() => {
      // If setting the expiry fails, the key just never gets an
      // eviction time — worse case is this one key over-limits
      // forever until manually cleared, not a security gap.
    });
  }

  if (count > limit) {
    const ttlRes = await fetch(`${upstashUrl}/ttl/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${upstashToken}` },
    });
    const { result: ttl } = ttlRes.ok
      ? ((await ttlRes.json()) as { result: number })
      : { result: windowSeconds };
    return { ok: false, retryAfterSeconds: ttl > 0 ? ttl : windowSeconds };
  }

  return { ok: true };
}

/**
 * Checks and consumes one hit against `key` under a `limit` per
 * `windowMs`. Fails open (returns ok: true) if Upstash is configured
 * but unreachable — a rate limiter that takes the whole site down
 * when Redis hiccups is worse than one that occasionally
 * under-limits.
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (upstashUrl && upstashToken) {
    try {
      return await checkUpstash(key, limit, windowMs);
    } catch {
      return checkMemory(key, limit, windowMs);
    }
  }
  return checkMemory(key, limit, windowMs);
}

/** Best-effort client IP from standard proxy headers (Vercel, most
 *  reverse proxies). Falls back to a constant so unattributable
 *  requests still share one bucket rather than bypassing the limit
 *  entirely. */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

/** A standard 429 response body/headers for a rate-limited request. */
export function rateLimitResponse(retryAfterSeconds: number, message = "Too many requests. Please try again later.") {
  return Response.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}
