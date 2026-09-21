"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Fires one anonymous "this path was viewed" beacon per page load —
 * powers the admin dashboard's Overview tab. Deliberately not a full
 * analytics setup: no cookie, no client id, no IP is ever read or
 * stored (see app/api/track/route.ts and the PageView model in
 * prisma/schema.prisma). If the request fails for any reason —
 * offline, an ad blocker, rate-limited — that's silently fine; a
 * missed page view never affects anything the visitor can see.
 */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const path = pathname || "/";
    const body = JSON.stringify({ path });
    try {
      const blob = new Blob([body], { type: "application/json" });
      if (!navigator.sendBeacon?.("/api/track", blob)) {
        fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
      }
    } catch {
      // Beacon/fetch can be blocked entirely (privacy extensions,
      // offline) — never worth surfacing to the visitor.
    }
  }, [pathname]);

  return null;
}
