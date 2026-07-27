"use client";

import { useEffect, useRef, useState } from "react";
import { Radio, Smartphone } from "lucide-react";
import { LoginEvent } from "@/lib/types";
import { formatRelativeTime, summarizeUserAgent } from "@/lib/utils";

// How often this polls for new logins. True push (WebSockets/SSE)
// would need infrastructure this app doesn't have on a serverless
// host — polling every 10s is a deliberate, simple tradeoff that
// still feels live for a "someone just logged in" use case, without
// needing a persistent connection.
const POLL_INTERVAL_MS = 10_000;

export function LoginActivityPanel() {
  const [events, setEvents] = useState<LoginEvent[] | null>(null);
  const [justArrived, setJustArrived] = useState<Set<string>>(new Set());
  const knownIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const res = await fetch("/api/admin/login-events");
      if (cancelled || !res.ok) return;
      const fresh: LoginEvent[] = await res.json();

      const newlyArrived = fresh.filter((e) => !knownIds.current.has(e.id)).map((e) => e.id);
      knownIds.current = new Set(fresh.map((e) => e.id));

      setEvents(fresh);
      if (newlyArrived.length > 0 && knownIds.current.size > newlyArrived.length) {
        // Only flag as "new" on updates after the first load — on
        // first load, everything is technically "new" to the
        // component but none of it just happened.
        setJustArrived(new Set(newlyArrived));
        setTimeout(() => setJustArrived(new Set()), 4000);
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Re-render periodically even with no new data, so "2m ago" keeps
  // counting up instead of freezing at whatever it said on last fetch.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const tick = setInterval(() => forceTick((n) => n + 1), 15_000);
    return () => clearInterval(tick);
  }, []);

  if (!events) return <p className="text-sm text-ink-500 dark:text-white/50">Loading activity...</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-ink-500 dark:text-white/50">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
        </span>
        Live · updates every {POLL_INTERVAL_MS / 1000}s
      </div>

      {events.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink-900/15 p-8 text-center text-sm text-ink-500 dark:border-white/15 dark:text-white/50">
          No member logins recorded yet.
        </p>
      ) : (
        <div className="divide-y divide-ink-900/10 overflow-hidden rounded-2xl border border-ink-900/10 dark:divide-white/10 dark:border-white/10">
          {events.map((event) => (
            <div
              key={event.id}
              className={`flex items-center gap-3 p-3.5 transition-colors ${
                justArrived.has(event.id) ? "bg-brand-50 dark:bg-brand-950/30" : ""
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900/5 text-ink-500 dark:bg-white/10 dark:text-white/60">
                <Smartphone className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{event.memberName}</p>
                <p className="truncate text-xs text-ink-500 dark:text-white/50">
                  {summarizeUserAgent(event.userAgent)}
                </p>
              </div>
              <p className="shrink-0 text-xs text-ink-500 dark:text-white/50">
                {formatRelativeTime(event.loggedInAt)}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-white/40">
        <Radio className="h-3 w-3" />
        Shows each successful member login. Doesn&rsquo;t track failed attempts or admin logins.
      </p>
    </div>
  );
}
