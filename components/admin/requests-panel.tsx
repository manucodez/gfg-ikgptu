"use client";

import { useEffect, useState } from "react";
import { Check, X, Clock, History, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/members/avatar";
import { MemberChangeRequest, MemberEditableFields } from "@/lib/types";

const FIELD_LABELS: Record<keyof MemberEditableFields, string> = {
  avatar: "Photo",
  year: "Year",
  branch: "Branch",
  bio: "Bio",
  skills: "Skills",
  github: "GitHub",
  linkedin: "LinkedIn",
  portfolio: "Portfolio",
};

function formatValue(field: keyof MemberEditableFields, value: unknown): string {
  if (value === undefined || value === null || value === "") return "(empty)";
  if (field === "skills" && Array.isArray(value)) return value.join(", ") || "(empty)";
  return String(value);
}

interface RequestsPanelProps {
  /** Called with the current pending-request count whenever it's known
   *  or changes, so the admin dashboard's "Requests" tab can show a
   *  live badge without this panel needing to know anything about
   *  tabs. */
  onPendingCountChange?: (count: number) => void;
}

export function RequestsPanel({ onPendingCountChange }: RequestsPanelProps = {}) {
  const [requests, setRequests] = useState<MemberChangeRequest[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  async function load() {
    const res = await fetch("/api/admin/requests");
    setRequests(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (requests) {
      onPendingCountChange?.(requests.filter((r) => r.status === "pending").length);
    }
    // onPendingCountChange intentionally excluded — the parent passes a
    // fresh setState function each render, and re-running this effect
    // only needs to happen when the requests themselves change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  async function handleResolve(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setErrorById((prev) => ({ ...prev, [id]: "" }));
    const res = await fetch(`/api/admin/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErrorById((prev) => ({ ...prev, [id]: data.error ?? "Couldn't resolve this request." }));
    }
    await load();
    setBusyId(null);
  }

  if (!requests) return <p className="text-sm text-ink-500 dark:text-white/50">Loading requests...</p>;

  const pending = requests.filter((r) => r.status === "pending");
  const resolved = requests.filter((r) => r.status !== "pending").slice(0, 10);

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-3 text-sm text-ink-500 dark:text-white/50">
          {pending.length} pending {pending.length === 1 ? "request" : "requests"}
        </p>

        {pending.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink-900/15 p-6 text-center text-sm text-ink-500 dark:border-white/15 dark:text-white/50">
            No pending profile change requests.
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((req) => {
              const isEmailRequest = (req.kind ?? "profile") === "email";
              const fields = isEmailRequest
                ? []
                : (Object.keys(req.changes) as (keyof MemberEditableFields)[]);
              return (
                <div key={req.id} className="rounded-2xl border border-ink-900/10 p-4 dark:border-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isEmailRequest ? (
                        <Mail className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                      ) : (
                        <Clock className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                      )}
                      <p className="font-medium">{req.memberName}</p>
                      {isEmailRequest && (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
                          Email change
                        </span>
                      )}
                      <span className="text-xs text-ink-500 dark:text-white/40">
                        {new Date(req.submittedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === req.id}
                        onClick={() => handleResolve(req.id, "reject")}
                      >
                        <X className="h-4 w-4" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={busyId === req.id}
                        onClick={() => handleResolve(req.id, "approve")}
                      >
                        <Check className="h-4 w-4" /> Approve
                      </Button>
                    </div>
                  </div>

                  {errorById[req.id] && (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
                      {errorById[req.id]}
                    </p>
                  )}

                  {isEmailRequest && req.emailChange ? (
                    <div className="mt-3 rounded-lg bg-ink-900/[0.03] p-3 text-sm dark:bg-white/5">
                      <p>
                        <span className="text-ink-500 line-through dark:text-white/40">
                          {req.emailChange.previousEmail || "(none)"}
                        </span>
                        {" → "}
                        <span className="font-medium">{req.emailChange.newEmail}</span>
                      </p>
                      <p className="mt-1 text-xs text-ink-500 dark:text-white/40">
                        A new password (chosen by the member) will be applied once approved.
                      </p>
                    </div>
                  ) : (
                    <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                      {fields.map((field) => (
                        <div key={field} className="rounded-lg bg-ink-900/[0.03] p-2.5 text-sm dark:bg-white/5">
                          <dt className="font-mono text-[11px] uppercase tracking-wide text-ink-500 dark:text-white/40">
                            {FIELD_LABELS[field]}
                          </dt>
                          {field === "avatar" ? (
                            <dd className="mt-1.5 flex items-center gap-3">
                              <div className="flex flex-col items-center gap-1">
                                <Avatar name={req.memberName} avatar={req.previous.avatar} size={36} />
                                <span className="text-[10px] text-ink-500 dark:text-white/40">Before</span>
                              </div>
                              <span className="text-ink-500 dark:text-white/40">→</span>
                              <div className="flex flex-col items-center gap-1">
                                <Avatar name={req.memberName} avatar={req.changes.avatar} size={36} />
                                <span className="text-[10px] text-ink-500 dark:text-white/40">Proposed</span>
                              </div>
                            </dd>
                          ) : (
                            <dd className="mt-0.5">
                              <span className="text-ink-500 line-through dark:text-white/40">
                                {formatValue(field, req.previous[field])}
                              </span>
                              {" → "}
                              <span className="font-medium">{formatValue(field, req.changes[field])}</span>
                            </dd>
                          )}
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {resolved.length > 0 && (
        <div>
          <p className="mb-3 flex items-center gap-1.5 text-sm text-ink-500 dark:text-white/50">
            <History className="h-3.5 w-3.5" /> Recently resolved
          </p>
          <div className="space-y-1.5">
            {resolved.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-sm text-ink-500 dark:text-white/50"
              >
                <span className="flex items-center gap-1.5">
                  {(req.kind ?? "profile") === "email" && <Mail className="h-3.5 w-3.5" />}
                  {req.memberName}
                </span>
                <span className={req.status === "approved" ? "text-brand-600 dark:text-brand-400" : ""}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
