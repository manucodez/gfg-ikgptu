"use client";

import { useEffect, useState } from "react";
import { Mail, Archive, Undo2, Trash2, FileText, CheckSquare, Square } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const PAGE_SIZE = 20;

export function JoinRequestsPanel({ onNewCountChange }: JoinRequestsPanelProps = {}) {
  const [requests, setRequests] = useState<JoinRequest[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  async function loadPage(pageToLoad: number, replace: boolean) {
    const res = await fetch(`/api/admin/join-requests?page=${pageToLoad}&pageSize=${PAGE_SIZE}`);
    const data = await res.json();
    setTotal(data.total);
    onNewCountChange?.(data.newCount);
    setRequests((prev) => (replace || !prev ? data.items : [...prev, ...data.items]));
    setPage(pageToLoad);
  }

  useEffect(() => {
    loadPage(1, true);
    // Only ever runs once on mount — see the note on the similar
    // effect for onNewCountChange further down for why it's excluded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLoadMore() {
    setLoadingMore(true);
    await loadPage(page + 1, false);
    setLoadingMore(false);
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelected(new Set(requests?.map((r) => r.id) ?? []));
  }

  async function refreshNewCount() {
    const res = await fetch(`/api/admin/join-requests?page=1&pageSize=1`);
    const data = await res.json().catch(() => null);
    if (data) onNewCountChange?.(data.newCount);
  }

  async function setStatus(id: string, status: JoinRequestStatus) {
    setBusyId(id);
    const res = await fetch(`/api/admin/join-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setRequests((prev) => prev?.map((r) => (r.id === id ? { ...r, status } : r)) ?? null);
      refreshNewCount();
    }
    setBusyId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this submission permanently?")) return;
    setBusyId(id);
    await fetch(`/api/admin/join-requests/${id}`, { method: "DELETE" });
    setRequests((prev) => prev?.filter((r) => r.id !== id) ?? null);
    setTotal((t) => Math.max(0, t - 1));
    refreshNewCount();
    setBusyId(null);
  }

  async function handleBulkStatus(status: JoinRequestStatus) {
    const ids = Array.from(selected);
    setBulkBusy(true);
    setBulkError(null);
    const res = await fetch("/api/admin/join-requests/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, status }),
    });
    if (res.ok) {
      setRequests((prev) => prev?.map((r) => (ids.includes(r.id) ? { ...r, status } : r)) ?? null);
      setSelected(new Set());
      refreshNewCount();
    } else {
      const data = await res.json().catch(() => ({}));
      setBulkError(data.error ?? "Couldn't update the selected requests.");
    }
    setBulkBusy(false);
  }

  async function handleBulkDelete() {
    const ids = Array.from(selected);
    if (!confirm(`Permanently remove ${ids.length} selected ${ids.length === 1 ? "submission" : "submissions"}?`)) return;
    setBulkBusy(true);
    setBulkError(null);
    const res = await fetch("/api/admin/join-requests/bulk", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) {
      setRequests((prev) => prev?.filter((r) => !ids.includes(r.id)) ?? null);
      setTotal((t) => Math.max(0, t - ids.length));
      setSelected(new Set());
      refreshNewCount();
    } else {
      const data = await res.json().catch(() => ({}));
      setBulkError(data.error ?? "Couldn't delete the selected requests.");
    }
    setBulkBusy(false);
  }

  if (!requests) return <p className="text-sm text-ink-500 dark:text-white/50">Loading submissions...</p>;

  if (requests.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-ink-900/15 p-8 text-center text-sm text-ink-500 dark:border-white/15 dark:text-white/50">
        No one&rsquo;s submitted the &ldquo;Join&rdquo; form yet.
      </p>
    );
  }

  const allVisibleSelected = requests.length > 0 && requests.every((r) => selected.has(r.id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-500 dark:text-white/50">
          {requests.length} of {total} {total === 1 ? "submission" : "submissions"} loaded · newest first
        </p>
        <button
          type="button"
          onClick={() => (allVisibleSelected ? setSelected(new Set()) : selectAllVisible())}
          className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-900 dark:text-white/50 dark:hover:text-white"
        >
          {allVisibleSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
          {allVisibleSelected ? "Deselect all loaded" : "Select all loaded"}
        </button>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-brand-600/30 bg-brand-600/5 p-3 backdrop-blur">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => handleBulkStatus("contacted")}>
            Mark contacted
          </Button>
          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => handleBulkStatus("archived")}>
            Archive
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={bulkBusy}
            onClick={handleBulkDelete}
            className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            Delete
          </Button>
          <Button size="sm" variant="ghost" disabled={bulkBusy} onClick={() => setSelected(new Set())}>
            Cancel
          </Button>
        </div>
      )}

      {bulkError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {bulkError}
        </p>
      )}

      {requests.map((r) => (
        <div
          key={r.id}
          className="flex gap-3 rounded-2xl border border-ink-900/10 p-4 dark:border-white/10"
        >
          <button
            type="button"
            onClick={() => toggleSelected(r.id)}
            aria-label={selected.has(r.id) ? `Deselect ${r.name}` : `Select ${r.name}`}
            className="mt-0.5 shrink-0 text-ink-400 hover:text-ink-700 dark:text-white/30 dark:hover:text-white/70"
          >
            {selected.has(r.id) ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          </button>
          <div className="min-w-0 flex-1">
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
                  className="mt-1 inline-flex max-w-full items-center gap-1.5 break-all text-sm text-brand-700 hover:underline dark:text-brand-400"
                >
                  <Mail className="h-3.5 w-3.5" /> {r.email}
                </a>
                {r.message && (
                  <p className="mt-2 max-w-2xl break-words text-sm text-ink-700 dark:text-white/70">{r.message}</p>
                )}
                {r.resumeUrl && (
                  <a
                    href={r.resumeUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm text-brand-700 hover:underline dark:text-brand-400"
                  >
                    <FileText className="h-3.5 w-3.5" /> View resume
                  </a>
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
                    className="rounded-full p-2.5 text-ink-500 hover:bg-ink-900/5 disabled:opacity-50 dark:text-white/50 dark:hover:bg-white/10"
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStatus(r.id, "new")}
                    disabled={busyId === r.id}
                    aria-label="Restore"
                    className="rounded-full p-2.5 text-ink-500 hover:bg-ink-900/5 disabled:opacity-50 dark:text-white/50 dark:hover:bg-white/10"
                  >
                    <Undo2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  disabled={busyId === r.id}
                  aria-label="Delete"
                  className="rounded-full p-2.5 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {requests.length < total && (
        <div className="pt-2 text-center">
          <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : `Load ${Math.min(PAGE_SIZE, total - requests.length)} more`}
          </Button>
        </div>
      )}
    </div>
  );
}
