"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Clock, X } from "lucide-react";
import { Avatar } from "@/components/members/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { isValidUrl } from "@/lib/validation";
import { Member, MemberChangeRequest } from "@/lib/types";

interface ProfileEditorProps {
  member: Member;
  pendingRequest: MemberChangeRequest | null;
}

const URL_FIELDS = ["github", "linkedin", "portfolio"] as const;

export function ProfileEditor({ member, pendingRequest }: ProfileEditorProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prefill from the member's live data, but let an already-pending
  // request's proposed values take priority, so editing continues
  // from what they last asked for rather than reverting silently.
  const initial = useMemo(
    () => ({
      year: pendingRequest?.changes.year ?? member.year,
      branch: pendingRequest?.changes.branch ?? member.branch,
      bio: pendingRequest?.changes.bio ?? member.bio,
      skills: (pendingRequest?.changes.skills ?? member.skills).join(", "),
      github: pendingRequest?.changes.github ?? member.socials.github ?? "",
      linkedin: pendingRequest?.changes.linkedin ?? member.socials.linkedin ?? "",
      portfolio: pendingRequest?.changes.portfolio ?? member.socials.portfolio ?? "",
    }),
    [member, pendingRequest]
  );

  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    pendingRequest?.changes.avatar ?? null
  );
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const errors: Record<string, string> = {};
    for (const field of URL_FIELDS) {
      const value = String(formData.get(field) ?? "").trim();
      if (value && !isValidUrl(value)) {
        errors[field] = "Enter a full link starting with https://";
      }
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    if (avatarFile) {
      formData.set("avatarFile", avatarFile);
    }

    setLoading(true);
    const res = await fetch("/api/member/request-change", { method: "POST", body: formData });

    if (res.ok) {
      setSuccess(true);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setFormError(data.error ?? "Couldn't submit your changes. Please try again.");
    }
    setLoading(false);
  }

  async function handleWithdraw() {
    if (!confirm("Withdraw your pending change request?")) return;
    setWithdrawing(true);
    await fetch("/api/member/request-change", { method: "DELETE" });
    router.refresh();
    setWithdrawing(false);
  }

  return (
    <div className="space-y-6">
      {pendingRequest && (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-900/40 dark:bg-brand-900/15">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-700 dark:text-brand-400" />
            <div>
              <p className="text-sm font-medium">Awaiting admin approval</p>
              <p className="text-sm text-ink-500 dark:text-white/60">
                Submitted {new Date(pendingRequest.submittedAt).toLocaleDateString()}. You
                can keep editing below — resubmitting replaces this request.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleWithdraw}
            disabled={withdrawing}
            aria-label="Withdraw request"
            className="shrink-0 rounded-full p-1.5 text-ink-500 hover:bg-ink-900/5 dark:text-white/50 dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && !pendingRequest && (
        <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">
          Submitted — a chapter admin will review your changes soon.
        </p>
      )}

      <form onSubmit={handleSubmit} className="card-surface space-y-5 p-6">
        <div className="flex items-center gap-4">
          <Avatar
            name={member.name}
            avatar={avatarPreview ?? member.avatar}
            size={72}
            className="shadow-soft"
          />
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-4 w-4" /> Change photo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Year">
            <Input name="year" defaultValue={initial.year} placeholder="e.g. 3rd Year" />
          </Field>
          <Field label="Branch">
            <Input name="branch" defaultValue={initial.branch} placeholder="e.g. B.Tech CSE" />
          </Field>
        </div>

        <Field label="Bio">
          <Textarea name="bio" defaultValue={initial.bio} rows={3} />
        </Field>

        <Field label="Skills (comma separated)">
          <Input name="skills" defaultValue={initial.skills} placeholder="React, DSA, Figma" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="GitHub URL" error={fieldErrors.github}>
            <Input name="github" type="url" defaultValue={initial.github} placeholder="https://github.com/you" />
          </Field>
          <Field label="LinkedIn URL" error={fieldErrors.linkedin}>
            <Input name="linkedin" type="url" defaultValue={initial.linkedin} placeholder="https://linkedin.com/in/you" />
          </Field>
        </div>
        <Field label="Portfolio URL" error={fieldErrors.portfolio}>
          <Input name="portfolio" type="url" defaultValue={initial.portfolio} placeholder="https://your-site.dev" />
        </Field>

        <p className="text-xs text-ink-500 dark:text-white/40">
          Your name, role, and team are set by a chapter admin and can&apos;t be
          changed here. Want to change your login email? Use the &quot;Login
          email&quot; card above.
        </p>

        {formError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? "Submitting..." : pendingRequest ? "Resubmit for approval" : "Submit for approval"}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}
