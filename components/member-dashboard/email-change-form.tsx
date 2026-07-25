"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Clock, X, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MemberChangeRequest } from "@/lib/types";

interface EmailChangeFormProps {
  currentEmail: string;
  pendingRequest: MemberChangeRequest | null;
}

export function EmailChangeForm({ currentEmail, pendingRequest }: EmailChangeFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/member/request-email-change", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail, newPassword }),
    });

    if (res.ok) {
      setOpen(false);
      setNewEmail("");
      setNewPassword("");
      setConfirmPassword("");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't submit that request. Please try again.");
    }
    setLoading(false);
  }

  async function handleWithdraw() {
    if (!confirm("Withdraw your pending email change request?")) return;
    setWithdrawing(true);
    await fetch("/api/member/request-email-change", { method: "DELETE" });
    router.refresh();
    setWithdrawing(false);
  }

  return (
    <div className="card-surface space-y-4 p-6">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-brand-600 dark:text-brand-400" />
        <p className="font-display text-base font-medium">Login email</p>
      </div>
      <p className="text-sm text-ink-500 dark:text-white/60">
        Registered email: <span className="font-medium text-ink-900 dark:text-white">{currentEmail}</span>
      </p>

      {pendingRequest?.emailChange ? (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-900/40 dark:bg-brand-900/15">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-700 dark:text-brand-400" />
            <div className="text-sm">
              <p className="font-medium">Awaiting admin approval</p>
              <p className="mt-0.5 text-ink-500 dark:text-white/60">
                {pendingRequest.emailChange.previousEmail} → {pendingRequest.emailChange.newEmail}
              </p>
              <p className="mt-0.5 text-xs text-ink-500 dark:text-white/40">
                Your new password will apply once an admin approves this change.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={withdrawing}
            aria-label="Withdraw email change request"
            className="shrink-0 rounded-full p-1.5 text-ink-500 hover:bg-ink-900/5 dark:text-white/50 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : open ? (
        <form onSubmit={handleSubmit} className="space-y-3 border-t border-ink-900/10 pt-4 dark:border-white/10">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">New email</span>
            <Input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="you@ikgptu.ac.in"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">New password for this email</span>
            <Input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Confirm new password</span>
            <Input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
            />
          </label>
          <p className="flex items-start gap-1.5 text-xs text-ink-500 dark:text-white/40">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            You&apos;ll keep signing in with your current email and password until a chapter admin
            approves this change.
          </p>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Submitting..." : "Submit for approval"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          Change email
        </Button>
      )}
    </div>
  );
}
