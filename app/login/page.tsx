"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Code2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 dark:bg-surface-dark">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white">
            <Code2 className="h-5 w-5" />
          </Link>
          <h1 className="mt-4 font-display text-2xl font-medium">Member Login</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-white/60">
            GFG Campus Chapter · IKGPTU
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card-surface space-y-4 p-6">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Registered email</label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@ikgptu.ac.in"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Password</label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"} <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="text-center text-sm">
            <Link href="/reset-password" className="font-medium text-brand-700 dark:text-brand-400">
              Forgot / set your password
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500 dark:text-white/50">
          Are you a chapter admin?{" "}
          <Link href="/admin/login" className="font-medium text-brand-700 dark:text-brand-400">
            Admin login
          </Link>
        </p>
      </div>
    </main>
  );
}
