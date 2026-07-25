import Link from "next/link";
import { redirect } from "next/navigation";
import { Code2 } from "lucide-react";
import { getPendingRequestForMember } from "@/lib/content-store";
import { getLoggedInMember } from "@/lib/current-member";
import { LogoutButton } from "@/components/auth/logout-button";
import { ProfileEditor } from "@/components/member-dashboard/profile-editor";
import { EmailChangeForm } from "@/components/member-dashboard/email-change-form";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const member = await getLoggedInMember();

  // middleware.ts already redirects unauthenticated requests away from
  // /dashboard — this check just keeps the page correct if it's ever
  // rendered directly, or if the member's account was removed from the
  // roster after they logged in.
  if (!member) {
    redirect("/login");
  }

  const [pendingProfileRequest, pendingEmailRequest] = await Promise.all([
    getPendingRequestForMember(member.id, "profile"),
    getPendingRequestForMember(member.id, "email"),
  ]);

  return (
    <main className="min-h-screen bg-paper dark:bg-surface-dark">
      <div className="border-b border-ink-900/10 bg-white dark:border-white/10 dark:bg-surface-darkRaised">
        <div className="container flex items-center justify-between py-5">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Code2 className="h-4 w-4" />
            </span>
            <span className="font-display text-sm font-semibold">GFG Campus Chapter</span>
          </Link>
          <LogoutButton endpoint="/api/auth/logout" redirectTo="/login" />
        </div>
      </div>

      <div className="container max-w-2xl py-12">
        <p className="eyebrow">{"// your profile"}</p>
        <h1 className="mt-3 font-display text-3xl font-medium">Hi, {member.name.split(" ")[0]}.</h1>
        <p className="mt-2 text-ink-500 dark:text-white/60">
          Update your photo, year, branch, bio, skills, and links below.
          Changes go to a chapter admin for approval before they appear on
          the public site.
        </p>
        <Link
          href="/reset-password"
          className="mt-2 inline-block text-sm font-medium text-brand-700 dark:text-brand-400"
        >
          Change your password →
        </Link>

        <div className="mt-8">
          <EmailChangeForm
            currentEmail={member.socials.email ?? ""}
            pendingRequest={pendingEmailRequest}
          />
        </div>

        <div className="mt-6">
          <ProfileEditor
            key={pendingProfileRequest ? pendingProfileRequest.id : "live"}
            member={member}
            pendingRequest={pendingProfileRequest}
          />
        </div>
      </div>
    </main>
  );
}
