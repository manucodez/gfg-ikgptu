/**
 * Codeforces has a stable, documented, no-auth-required public API
 * (https://codeforces.com/apiHelp), which makes it the one contest
 * platform this project integrates with directly — LeetCode and GFG
 * itself don't offer anything as reliable (LeetCode's is an
 * unofficial, frequently-breaking GraphQL endpoint; GFG has no public
 * API at all). See the codeforcesHandle field on Member for how a
 * member opts in.
 */

export interface CodeforcesProfile {
  handle: string;
  rating: number | null;
  maxRating: number | null;
  rank: string | null;
}

interface CachedEntry {
  value: CodeforcesProfile | null;
  fetchedAt: number;
}

// In-memory only, per server instance — good enough here since this
// is a nice-to-have badge, not something that needs to be perfectly
// fresh or shared across instances. Worst case on a cold serverless
// instance is one extra real API call.
const cache = new Map<string, CachedEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — ratings don't change often

/**
 * Looks up a Codeforces handle. Returns null (not a throw) for a
 * handle that doesn't exist on Codeforces, or if Codeforces is
 * unreachable/slow — a missing rating badge is a fine failure mode
 * for a page that must otherwise still render.
 */
export async function getCodeforcesProfile(handle: string): Promise<CodeforcesProfile | null> {
  const normalized = handle.trim();
  if (!normalized) return null;

  const cached = cache.get(normalized.toLowerCase());
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://codeforces.com/api/user.info?handles=${encodeURIComponent(normalized)}`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) {
      cache.set(normalized.toLowerCase(), { value: null, fetchedAt: Date.now() });
      return null;
    }

    const data = (await res.json()) as {
      status: string;
      result?: { handle: string; rating?: number; maxRating?: number; rank?: string }[];
    };

    if (data.status !== "OK" || !data.result?.[0]) {
      cache.set(normalized.toLowerCase(), { value: null, fetchedAt: Date.now() });
      return null;
    }

    const user = data.result[0];
    const profile: CodeforcesProfile = {
      handle: user.handle,
      rating: user.rating ?? null,
      maxRating: user.maxRating ?? null,
      rank: user.rank ?? null,
    };
    cache.set(normalized.toLowerCase(), { value: profile, fetchedAt: Date.now() });
    return profile;
  } catch {
    // Network error, timeout, or malformed response — never let this
    // bubble up and break the profile page it's decorating.
    return null;
  }
}
