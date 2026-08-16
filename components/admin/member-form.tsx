"use client";

import { useState } from "react";
import { Dices, Copy, Check, Eye, EyeOff, ImageOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/members/avatar";
import { Member } from "@/lib/types";

interface MemberFormProps {
  initial?: Member;
  credential?: { hasPassword: boolean; passwordUpdatedAt: string };
  onDone: () => void;
  onCancel?: () => void;
}

// Unambiguous character set (no 0/O, 1/l/I) so a password read aloud
// or copied by hand doesn't get mistyped.
const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

function generatePassword(length = 12): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join("");
}

export function MemberForm({ initial, credential, onDone, onCancel }: MemberFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  // Deleting the current photo only ever happens from inside this
  // edit form now (not from the members list row) — tracked locally
  // so the preview + button disappear the instant it's removed,
  // without needing to close the form and reload.
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const isEdit = !!initial;

  function handleGeneratePassword() {
    const generated = generatePassword();
    setPassword(generated);
    setShowPassword(true);
    setCopied(false);
  }

  async function handleCopyPassword() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permissions can be denied — the field is still
      // visible for a manual copy, so this isn't fatal.
    }
  }

  async function handleRemovePhoto() {
    if (!initial) return;
    if (!confirm(`Remove ${initial.name}'s photo? They'll show up as an initials tile instead.`)) return;
    setRemovingAvatar(true);
    const res = await fetch(`/api/admin/members/${initial.id}/avatar`, { method: "DELETE" });
    if (res.ok) setAvatarRemoved(true);
    setRemovingAvatar(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const url = isEdit ? `/api/admin/members/${initial!.id}` : "/api/admin/members";
    const res = await fetch(url, { method: isEdit ? "PATCH" : "POST", body: formData });

    if (res.ok) {
      onDone();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't save this member.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-ink-900/10 p-5 dark:border-white/10">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <Input name="name" defaultValue={initial?.name} required />
        </Field>
        <Field label="Role / designation">
          <Input name="role" defaultValue={initial?.role} required />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Team">
          <Input name="team" defaultValue={initial?.team} required placeholder="e.g. Technical Team" />
        </Field>
        <Field label="Year">
          <Input name="year" defaultValue={initial?.year} placeholder="e.g. 3rd Year" />
        </Field>
        <Field label="Branch">
          <Input name="branch" defaultValue={initial?.branch} placeholder="e.g. B.Tech CSE" />
        </Field>
      </div>
      <Field label="Bio">
        <Textarea name="bio" defaultValue={initial?.bio} rows={2} />
      </Field>
      <Field label="Skills (comma separated)">
        <Input name="skills" defaultValue={initial?.skills?.join(", ") ?? ""} placeholder="React, DSA, Figma" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="GitHub URL">
          <Input name="github" type="url" defaultValue={initial?.socials.github} placeholder="https://github.com/username" />
        </Field>
        <Field label="LinkedIn URL">
          <Input name="linkedin" type="url" defaultValue={initial?.socials.linkedin} placeholder="https://linkedin.com/in/username" />
        </Field>
        <Field label="Email (public contact + their login)">
          <Input name="email" type="email" defaultValue={initial?.socials.email} placeholder="member@ikgptu.ac.in" />
        </Field>
        <Field label="Portfolio URL">
          <Input name="portfolio" type="url" defaultValue={initial?.socials.portfolio} placeholder="https://their-site.dev" />
        </Field>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium">
          {isEdit ? "Set a new password (optional)" : "Initial password (optional)"}
        </span>
        {isEdit && (
          <p className="mb-2 text-xs text-ink-500 dark:text-white/40">
            {credential?.hasPassword
              ? `Currently has a password, last set ${new Date(credential.passwordUpdatedAt).toLocaleString()}. Passwords are one-way encrypted, so it can't be displayed — only replaced.`
              : "No password set yet."}
          </p>
        )}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? "Leave blank to keep their current password" : "At least 8 characters"}
              className="pr-9"
            />
            {password && (
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-900 dark:text-white/40 dark:hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="md"
            className="w-11 shrink-0 px-0"
            onClick={handleGeneratePassword}
            title="Generate a strong password"
            aria-label="Generate a strong password"
          >
            <Dices className="h-4 w-4" />
          </Button>
          {password && (
            <Button
              type="button"
              variant="outline"
              size="md"
              className="w-11 shrink-0 px-0"
              onClick={handleCopyPassword}
              title="Copy password"
              aria-label="Copy password"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          )}
        </div>
        <span className="mt-1 block text-xs text-ink-500 dark:text-white/40">
          Share this with them yourself, over a channel you trust — it won&apos;t be shown again once
          you leave this form. They can always change it afterward from the login page&apos;s
          &quot;Forgot / set password&quot; link. Requires a login email above — set one first if
          this member doesn&apos;t have one yet.
        </span>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium">
          {isEdit ? "Photo" : "Photo (optional)"}
        </span>
        {isEdit && initial?.avatar && !avatarRemoved && (
          <div className="mb-3 flex items-center gap-3">
            <Avatar name={initial.name} avatar={initial.avatar} size={52} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRemovePhoto}
              disabled={removingAvatar}
            >
              <ImageOff className="h-3.5 w-3.5" />
              {removingAvatar ? "Removing..." : "Remove photo"}
            </Button>
          </div>
        )}
        {isEdit && avatarRemoved && (
          <p className="mb-2 text-xs text-ink-500 dark:text-white/40">
            Photo removed — they&apos;ll show as an initials tile unless you upload a new one below.
          </p>
        )}
        <input
          type="file"
          name="avatarFile"
          accept="image/*"
          className="block w-full text-sm text-ink-500 file:mr-3 file:rounded-full file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 dark:text-white/50 dark:file:bg-brand-900/40 dark:file:text-brand-400"
        />
        {isEdit && (
          <span className="mt-1 block text-xs text-ink-500 dark:text-white/40">
            Uploading a new photo here replaces the current one automatically.
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Saving..." : isEdit ? "Save changes" : "Add member"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
