"use client";

import { useEffect, useState } from "react";
import type { CodeforcesProfile } from "@/lib/codeforces";

// Codeforces' own rating-to-color convention (gray/green/cyan/blue/
// purple/orange/red as rating climbs) — recognizable to anyone who's
// used the site, so reusing it here rather than inventing a new scale.
function ratingColor(rating: number | null): string {
  if (rating === null) return "text-ink-500 dark:text-white/50";
  if (rating < 1200) return "text-ink-500 dark:text-white/50"; // newbie
  if (rating < 1400) return "text-green-600 dark:text-green-400"; // pupil
  if (rating < 1600) return "text-cyan-600 dark:text-cyan-400"; // specialist
  if (rating < 1900) return "text-blue-600 dark:text-blue-400"; // expert
  if (rating < 2100) return "text-purple-600 dark:text-purple-400"; // candidate master
  if (rating < 2400) return "text-orange-500 dark:text-orange-400"; // master/international master
  return "text-red-600 dark:text-red-400"; // grandmaster and above
}

/**
 * Shown on a member's profile when they've set a Codeforces handle
 * (see lib/codeforces.ts). Fetches lazily on mount rather than as
 * part of the member list/profile data, so opening a profile is the
 * only thing that ever triggers the external API call — the
 * homepage's member grid never does.
 */
export function CodeforcesBadge({ memberId }: { memberId: string }) {
  const [profile, setProfile] = useState<CodeforcesProfile | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/members/${memberId}/codeforces`)
      .then((res) => (res.ok ? res.json() : { profile: null }))
      .then((data) => {
        if (!cancelled) setProfile(data.profile ?? null);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [memberId]);

  // undefined = still loading, null = no handle set or lookup failed —
  // both render nothing rather than a loading flicker for what's a
  // minor supporting detail on the profile.
  if (!profile) return null;

  return (
    <a
      href={`https://codeforces.com/profile/${encodeURIComponent(profile.handle)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-ink-900/10 px-2.5 py-1 text-xs font-medium hover:bg-ink-900/5 dark:border-white/10 dark:hover:bg-white/5"
    >
      <span className="text-ink-500 dark:text-white/50">Codeforces</span>
      <span className={ratingColor(profile.rating)}>
        {profile.rating !== null ? profile.rating : "Unrated"}
      </span>
    </a>
  );
}
