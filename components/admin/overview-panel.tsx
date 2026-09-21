"use client";

import { useEffect, useState } from "react";
import type { OverviewStats } from "@/lib/types";

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-ink-900/10 p-4 dark:border-white/10">
      <p className="font-display text-2xl font-semibold">{value.toLocaleString()}</p>
      <p className="mt-1 text-sm text-ink-500 dark:text-white/50">{label}</p>
    </div>
  );
}

function FunnelBar({ label, value, total, colorClass }: { label: string; value: number; total: number; colorClass: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-ink-700 dark:text-white/70">{label}</span>
        <span className="font-mono text-ink-500 dark:text-white/50">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-900/5 dark:bg-white/10">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Plain CSS bars rather than a charting library — this project keeps
 *  its dependency footprint deliberately small (see package.json),
 *  and 30 daily totals don't need more than this to read clearly. */
function ViewsChart({ data }: { data: { date: string; views: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.views));
  return (
    <div>
      <div className="flex h-28 items-end gap-[3px]">
        {data.map((d) => (
          <div
            key={d.date}
            className="group relative flex-1 rounded-t bg-brand-600/70 transition-colors hover:bg-brand-600 dark:bg-brand-500/60 dark:hover:bg-brand-500"
            style={{ height: `${Math.max(2, (d.views / max) * 100)}%` }}
          >
            <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block dark:bg-white dark:text-ink-900">
              {new Date(d.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}: {d.views}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-ink-500 dark:text-white/40">
        <span>{new Date(data[0]?.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        <span>{new Date(data[data.length - 1]?.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
      </div>
    </div>
  );
}

export function OverviewPanel() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/overview")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setStats)
      .catch(() => setError("Couldn't load the overview."));
  }, []);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!stats) return <p className="text-sm text-ink-500 dark:text-white/50">Loading overview...</p>;

  const funnelTotal = stats.joinRequestFunnel.new + stats.joinRequestFunnel.contacted + stats.joinRequestFunnel.archived;
  const totalViews = stats.last30DaysViews.reduce((sum, d) => sum + d.views, 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Members" value={stats.memberCount} />
        <StatCard label="Upcoming events" value={stats.upcomingEventCount} />
        <StatCard label="Pending profile requests" value={stats.pendingChangeRequestCount} />
        <StatCard label="New join requests" value={stats.newJoinRequestCount} />
      </div>

      <div className="rounded-2xl border border-ink-900/10 p-5 dark:border-white/10">
        <h3 className="mb-4 font-display text-sm font-semibold">Join request funnel</h3>
        {funnelTotal === 0 ? (
          <p className="text-sm text-ink-500 dark:text-white/50">No join requests yet.</p>
        ) : (
          <div className="space-y-3">
            <FunnelBar label="New" value={stats.joinRequestFunnel.new} total={funnelTotal} colorClass="bg-brand-600 dark:bg-brand-500" />
            <FunnelBar label="Contacted" value={stats.joinRequestFunnel.contacted} total={funnelTotal} colorClass="bg-amber-500" />
            <FunnelBar label="Archived" value={stats.joinRequestFunnel.archived} total={funnelTotal} colorClass="bg-ink-400 dark:bg-white/30" />
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-ink-900/10 p-5 dark:border-white/10">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="font-display text-sm font-semibold">Page views, last 30 days</h3>
          <span className="text-xs text-ink-500 dark:text-white/40">{totalViews.toLocaleString()} total</span>
        </div>
        {totalViews === 0 ? (
          <p className="text-sm text-ink-500 dark:text-white/50">
            No page views recorded yet — this fills in once visitors load the site with tracking enabled.
          </p>
        ) : (
          <ViewsChart data={stats.last30DaysViews} />
        )}
      </div>

      {stats.topPaths.length > 0 && (
        <div className="rounded-2xl border border-ink-900/10 p-5 dark:border-white/10">
          <h3 className="mb-4 font-display text-sm font-semibold">Most-viewed pages</h3>
          <div className="space-y-2.5">
            {stats.topPaths.map((p) => {
              const max = stats.topPaths[0]?.views || 1;
              return (
                <div key={p.path}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="truncate font-mono text-xs text-ink-700 dark:text-white/70">{p.path}</span>
                    <span className="shrink-0 pl-2 font-mono text-ink-500 dark:text-white/50">{p.views}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink-900/5 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-brand-600/70 dark:bg-brand-500/60"
                      style={{ width: `${Math.max(4, (p.views / max) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
