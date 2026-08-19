"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, KeyRound, Dices, Copy, Check, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { Admin } from "@/lib/types";

// Unambiguous character set (no 0/O, 1/l/I) so a password read aloud
// or copied by hand doesn't get mistyped — same generator as the
// member form's initial/reset password field.
const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

function generatePassword(length = 12): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join("");
}

/** A password input with generate / show-hide / copy affordances,
 *  shared by the "add admin" form and the per-row "reset password"
 *  action below. */
function PasswordField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permissions can be denied — the field is still
      // visible for a manual copy, so this isn't fatal.
    }
  }

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "At least 8 characters"}
          className="pr-9"
        />
        {value && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-900 dark:text-white/50 dark:hover:text-white"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          onChange(generatePassword());
          setShow(true);
          setCopied(false);
        }}
        title="Generate a strong password"
        aria-label="Generate a strong password"
      >
        <Dices className="h-4 w-4" />
      </Button>
      {value && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          title="Copy password"
          aria-label="Copy password"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}

export function AdminsPanel() {
  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Shown once right after a successful create, since the password
  // can't be retrieved again after this — see the note in the form.
  const [justCreated, setJustCreated] = useState<{ email: string; password: string } | null>(null);

  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  async function load() {
    const res = await fetch("/api/admin/admins");
    setAdmins(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setAdding(false);
    setName("");
    setEmail("");
    setPassword("");
    setError(null);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (res.ok) {
      setJustCreated({ email, password });
      resetForm();
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't add this admin.");
    }
    setLoading(false);
  }

  async function handleResetPassword(id: string) {
    if (resetPassword.length < 8) {
      setResetError("Password must be at least 8 characters.");
      return;
    }
    setResetError(null);
    const res = await fetch(`/api/admin/admins/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPassword }),
    });
    if (res.ok) {
      setResettingId(null);
      setResetPassword("");
    } else {
      const data = await res.json().catch(() => ({}));
      setResetError(data.error ?? "Couldn't reset this password.");
    }
  }

  async function handleDelete(admin: Admin) {
    if (!confirm(`Remove ${admin.name}'s admin account? They'll be signed out immediately.`)) return;
    setRowError(null);
    const res = await fetch(`/api/admin/admins/${admin.id}`, { method: "DELETE" });
    if (res.ok) {
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setRowError({ id: admin.id, message: data.error ?? "Couldn't remove this admin." });
    }
  }

  if (!admins) return <p className="text-sm text-ink-500 dark:text-white/50">Loading admins...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-white/50">
          {admins.length} {admins.length === 1 ? "admin" : "admins"} · each signs in with their own email
          and password
        </p>
        {!adding && (
          <Button size="sm" onClick={() => { setAdding(true); setJustCreated(null); }}>
            <Plus className="h-4 w-4" /> Add admin
          </Button>
        )}
      </div>

      {justCreated && (
        <div className="space-y-2 rounded-2xl border border-brand-600/30 bg-brand-600/5 p-5">
          <p className="text-sm font-medium">
            Admin added — share this password with them now. It won&apos;t be shown again.
          </p>
          <p className="font-mono text-sm">
            {justCreated.email} · {justCreated.password}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => setJustCreated(null)}>
            Done
          </Button>
        </div>
      )}

      {adding && (
        <form onSubmit={handleAdd} className="space-y-4 rounded-2xl border border-ink-900/10 p-5 dark:border-white/10">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Name</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Priya Sharma" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Email</span>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="priya@gfg-ikgptu.org"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Password</span>
            <PasswordField value={password} onChange={setPassword} />
          </label>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Adding..." : "Add admin"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {admins.map((admin) => (
          <div key={admin.id} className="rounded-2xl border border-ink-900/10 p-4 dark:border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{admin.name}</p>
                <p className="truncate text-sm text-ink-500 dark:text-white/50">{admin.email}</p>
                <p className="mt-0.5 text-xs text-ink-500 dark:text-white/40">
                  Added {new Date(admin.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setResettingId(resettingId === admin.id ? null : admin.id);
                    setResetPassword("");
                    setResetError(null);
                  }}
                  aria-label={`Reset ${admin.name}'s password`}
                  className="rounded-full p-2.5 text-ink-500 hover:bg-ink-900/5 dark:text-white/50 dark:hover:bg-white/10"
                >
                  <KeyRound className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(admin)}
                  aria-label={`Remove ${admin.name}`}
                  className="rounded-full p-2.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {resettingId === admin.id && (
              <div className="mt-4 space-y-2 border-t border-ink-900/10 pt-4 dark:border-white/10">
                <span className="block text-sm font-medium">New password for {admin.name}</span>
                <PasswordField value={resetPassword} onChange={setResetPassword} />
                {resetError && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
                    {resetError}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button type="button" size="sm" onClick={() => handleResetPassword(admin.id)}>
                    Set new password
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setResettingId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {rowError?.id === admin.id && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
                {rowError.message}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
