/**
 * Next.js's App Router convention: shown automatically while a route
 * segment is loading (e.g. navigating client-side to a page whose
 * server data isn't back yet). Deliberately a plain spinner rather
 * than a content skeleton — the pages here (homepage, dashboard,
 * admin) have different enough layouts that a generic skeleton would
 * mismatch more often than it'd help, and this only shows briefly
 * between navigations, not on first load (that's PwaSplash's job).
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper dark:bg-surface-dark">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-ink-900/10 border-t-brand-600 dark:border-white/10 dark:border-t-brand-400"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
