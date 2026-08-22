"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, CheckCircle2 } from "lucide-react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Step = "email" | "verify" | "done";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      setStep("verify");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't send a code. Please try again.");
    }
    setLoading(false);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, newPassword }),
    });

    if (res.ok) {
      setStep("done");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't verify that code. Please try again.");
    }
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 dark:bg-surface-dark">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* The white backdrop only shows in dark mode — the logo's
              navy "Chapter" text is nearly invisible directly against
              the dark theme's near-black background otherwise. This
              keeps the logo artwork itself untouched rather than
              generating a dark-mode-specific recolored version. */}
          <Link href="/" className="rounded-2xl dark:bg-white dark:p-4 dark:shadow-sm">
            <Image
              src="/logo.png"
              alt="GFG Campus Chapter, IKGPTU logo"
              width={1283}
              height={869}
              className="h-20 w-auto"
            />
          </Link>
          <h1 className="mt-4 font-display text-2xl font-medium">Set your password</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-white/60">
            GFG Campus Chapter · IKGPTU
          </p>
        </div>

        {step === "email" && (
          <form onSubmit={handleRequestCode} className="card-surface space-y-4 p-6">
            <p className="eyebrow">{"// step 1 of 2"}</p>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Registered email</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@ikgptu.ac.in"
              />
              <p className="mt-1.5 text-xs text-ink-500 dark:text-white/40">
                We&apos;ll send a 6-digit code to this address to confirm it&apos;s you.
              </p>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send code"} <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        )}

        {step === "verify" && (
          <form onSubmit={handleVerify} className="card-surface space-y-4 p-6">
            <p className="eyebrow">{"// step 2 of 2"}</p>
            <div>
              <label className="mb-1.5 block text-sm font-medium">6-digit code</label>
              <Input
                inputMode="numeric"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
              />
              <p className="mt-1.5 text-xs text-ink-500 dark:text-white/40">
                Sent to {email}. Codes expire after 10 minutes.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">New password</label>
              <Input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Confirm new password</label>
              <Input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Saving..." : "Set password"} <KeyRound className="h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="w-full text-center text-sm text-ink-500 dark:text-white/50"
            >
              Use a different email
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="card-surface flex flex-col items-center gap-3 p-6 text-center">
            <CheckCircle2 className="h-9 w-9 text-brand-600 dark:text-brand-400" />
            <p className="font-display text-lg font-medium">Password set</p>
            <p className="text-sm text-ink-500 dark:text-white/60">
              You can now sign in with your new password.
            </p>
            <Button className="mt-2 w-full" onClick={() => router.push("/login")}>
              Go to login <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-ink-500 dark:text-white/50">
          <Link href="/login" className="font-medium text-brand-700 dark:text-brand-400">
            ← Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}
