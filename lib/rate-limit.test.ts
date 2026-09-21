import { describe, it, expect } from "vitest";
import { checkRateLimit, getClientIp } from "./rate-limit";

// These exercise the in-memory fallback specifically — the test
// environment has no UPSTASH_REDIS_REST_URL/TOKEN set, so
// checkRateLimit always takes that path here. See the Upstash-mode
// code path's own comments in rate-limit.ts for what differs in
// production when those env vars are set.

describe("checkRateLimit (in-memory mode)", () => {
  it("allows requests up to the limit, then blocks", async () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      const result = await checkRateLimit(key, 3, 60_000);
      expect(result.ok).toBe(true);
    }
    const blocked = await checkRateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", async () => {
    const keyA = `test:a:${Math.random()}`;
    const keyB = `test:b:${Math.random()}`;
    await checkRateLimit(keyA, 1, 60_000);
    const aBlocked = await checkRateLimit(keyA, 1, 60_000);
    const bAllowed = await checkRateLimit(keyB, 1, 60_000);
    expect(aBlocked.ok).toBe(false);
    expect(bAllowed.ok).toBe(true);
  });

  it("resets after the window elapses", async () => {
    const key = `test:window:${Math.random()}`;
    const shortWindow = 10; // ms
    await checkRateLimit(key, 1, shortWindow);
    const blocked = await checkRateLimit(key, 1, shortWindow);
    expect(blocked.ok).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, shortWindow + 20));
    const allowedAgain = await checkRateLimit(key, 1, shortWindow);
    expect(allowedAgain.ok).toBe(true);
  });
});

describe("getClientIp", () => {
  it("reads the first address from x-forwarded-for", () => {
    const request = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" },
    });
    expect(getClientIp(request)).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const request = new Request("https://example.com", {
      headers: { "x-real-ip": "198.51.100.7" },
    });
    expect(getClientIp(request)).toBe("198.51.100.7");
  });

  it("falls back to a constant when neither header is present", () => {
    const request = new Request("https://example.com");
    expect(getClientIp(request)).toBe("unknown");
  });
});
