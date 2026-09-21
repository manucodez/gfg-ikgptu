import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 dark:bg-surface-dark">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="inline-block">
          <Logo className="mx-auto h-16 w-auto" />
        </Link>
        <p className="mt-6 font-mono text-sm text-brand-600 dark:text-brand-400">404</p>
        <h1 className="mt-2 font-display text-2xl font-medium">Page not found</h1>
        <p className="mt-2 text-sm text-ink-500 dark:text-white/60">
          That page doesn&apos;t exist, or it&apos;s moved. Let&apos;s get you back on track.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-brand-600 px-6 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-700"
        >
          Back to homepage
        </Link>
      </div>
    </main>
  );
}
