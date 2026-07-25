"use client";

import { useEffect, useState } from "react";
import { Mail, Archive, Undo2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { JoinRequest, JoinRequestStatus } from "@/lib/types";
import { formatDisplayDate } from "@/lib/utils";

interface JoinRequestsPanelProps {
  /** Called with the current "new" (unreviewed) count whenever it's
   *  known or changes, so the admin dashboard's tab can show a live
   *  badge without this panel needing to know anything about tabs. */
  onNewCountChange?: (count: number) => void;
}

const STATUS_TONE: Record<JoinRequestStatus, "brand" | "neutral" | "past"> = {
  new: "brand",
  contacted: "neutral",
  archived: "past",
};

export function JoinRequestsPanel({ onNewCountChange }: JoinRequestsPanelProps = {}) {
  const [requests, setRequests] = useState<JoinRequest[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/join-requests");
    setRequests(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (requests) {
      onNewCountChange?.(requests.filter((r) => r.status === "new").length);
    }
    // onNewCountChange intentionally excluded — the parent passes a
    // fresh setState function each render, and re-running this effect
    // only needs to happen when the requests themselves change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  async function setStatus(id: string, status: JoinRequestStatus) {
    setBusyId(id);
    const res = await fetch(`/api/admin/join-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setRequests((prev) => prev?.map((r) => (r.id === id ? { ...r, status } : r)) ?? null);
    }
    setBusyId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this submission permanently?")) return;
    setBusyId(id);
    await fetch(`/api/admin/join-requests/${id}`, { method: "DELETE" });
    setRequests((prev) => prev?.filter((r) => r.id !== id) ?? null);
    setBusyId(null);
  }

  if (!requests) return <p className="text-sm text-ink-500 dark:text-white/50">Loading submissions...</p>;

  if (requests.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-ink-900/15 p-8 text-center text-sm text-ink-500 dark:border-white/15 dark:text-white/50">
        No one&rsquo;s submitted the &ldquo;Join&rdquo; form yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-500 dark:text-white/50">
        {requests.length} {requests.length === 1 ? "submission" : "submissions"} · newest first
      </p>

      {requests.map((r) => (
        <div key={r.id} className="rounded-2xl border border-ink-900/10 p-4 dark:border-white/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{r.name}</p>
                <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
              </div>
              <p className="mt-0.5 text-sm text-ink-500 dark:text-white/50">
                {r.branch} · {r.year} · {formatDisplayDate(r.submittedAt)}
              </p>
              <a
                href={`mailto:${r.email}`}
                className="mt-1 inline-flex items-center gap-1.5 text-sm text-brand-700 hover:underline dark:text-brand-400"
              >
                <Mail className="h-3.5 w-3.5" /> {r.email}
              </a>
              {r.message && (
                <p className="mt-2 max-w-2xl text-sm text-ink-700 dark:text-white/70">{r.message}</p>
              )}
            </div>

            <div className="flex shrink-0 gap-1">
              {r.status !== "contacted" && (
                <button
                  type="button"
                  onClick={() => setStatus(r.id, "contacted")}
                  disabled={busyId === r.id}
                  className="rounded-full px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50 dark:text-brand-400 dark:hover:bg-brand-950/30"
                >
                  Mark contacted
                </button>
              )}
              {r.status !== "archived" ? (
                <button
                  type="button"
                  onClick={() => setStatus(r.id, "archived")}
                  disabled={busyId === r.id}
                  aria-label="Archive"
                  className="rounded-full p-2 text-ink-500 hover:bg-ink-900/5 disabled:opacity-50 dark:text-white/50 dark:hover:bg-white/10"
                >
                  <Archive className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStatus(r.id, "new")}
                  disabled={busyId === r.id}
                  aria-label="Restore"
                  className="rounded-full p-2 text-ink-500 hover:bg-ink-900/5 disabled:opacity-50 dark:text-white/50 dark:hover:bg-white/10"
                >
                  <Undo2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                disabled={busyId === r.id}
                aria-label="Delete"
                className="rounded-full p-2 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
