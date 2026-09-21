"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";

/**
 * Next.js's App Router convention: this file automatically wraps
 * everything below app/ in a React error boundary. Must be a Client
 * Component (Next.js requirement for error.tsx) since error boundaries
 * are inherently a client-side React feature.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Always logged to the browser console (and, on Vercel, captured
    // in function/edge logs via the digest) so a report of "the site
    // broke" is diagnosable — this component intentionally shows the
    // visitor nothing more specific than "something went wrong",
    // since a raw error message/stack can leak implementation details.
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 dark:bg-surface-dark">
      <div className="w-full max-w-sm text-center">
        <Logo className="mx-auto h-16 w-auto" />
        <h1 className="mt-6 font-display text-2xl font-medium">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-500 dark:text-white/60">
          That&apos;s on us, not you. Try again, or head back to the homepage.
          {error.digest && (
            <>
              <br />
              <span className="font-mono text-xs text-ink-400 dark:text-white/40">
                Reference: {error.digest}
              </span>
            </>
          )}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center justify-center rounded-full bg-brand-600 px-6 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-700"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-full border border-ink-900/10 px-6 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-900/5 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/10"
          >
            Homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
