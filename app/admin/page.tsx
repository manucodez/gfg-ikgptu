import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LogoMark } from "@/components/logo";
import { SESSION_COOKIES, verifySessionToken, type AdminSessionPayload } from "@/lib/session";
import { LogoutButton } from "@/components/auth/logout-button";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default async function AdminPage() {
  const token = cookies().get(SESSION_COOKIES.admin)?.value;
  const session = token ? await verifySessionToken<AdminSessionPayload>(token) : null;

  // middleware.ts already redirects unauthenticated requests away from
  // /admin — this check just keeps the page correct if it's ever
  // rendered directly.
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <main className="min-h-screen bg-paper dark:bg-surface-dark">
      <div className="sticky top-0 z-40 border-b border-ink-900/10 bg-white dark:border-white/10 dark:bg-surface-darkRaised">
        <div className="container flex items-center justify-between gap-3 py-5">
          <div className="flex min-w-0 items-center gap-2">
            <LogoMark className="h-8 w-auto shrink-0" />
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold leading-tight">Admin Dashboard</p>
              <p className="truncate text-xs text-ink-500 dark:text-white/50">
                {session.name} · {session.email}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/" className="text-sm text-ink-500 hover:text-brand-600 dark:text-white/60">
              View site
            </Link>
            <LogoutButton endpoint="/api/admin/logout" redirectTo="/admin/login" />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <AdminDashboard />
      </div>
    </main>
  );
}
