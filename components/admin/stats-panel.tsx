"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatItem } from "@/lib/types";

interface StatDraft {
  label: string;
  value: string;
  suffix: string;
}

const EMPTY_DRAFT: StatDraft = { label: "", value: "", suffix: "" };

export function StatsPanel() {
  const [stats, setStats] = useState<StatItem[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<StatDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<StatDraft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/stats");
    setStats(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    if (res.ok) {
      setAdding(false);
      setDraft(EMPTY_DRAFT);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't add this stat.");
    }
    setLoading(false);
  }

  function startEdit(stat: StatItem) {
    setEditingId(stat.id);
    setEditDraft({ label: stat.label, value: String(stat.value), suffix: stat.suffix ?? "" });
    setError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/stats/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editDraft),
    });
    if (res.ok) {
      setEditingId(null);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't save this stat.");
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this stat from the homepage?")) return;
    await fetch(`/api/admin/stats/${id}`, { method: "DELETE" });
    load();
  }

  if (!stats) return <p className="text-sm text-ink-500 dark:text-white/50">Loading stats...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-white/50">
          Shown in a row on the homepage, in this order.
        </p>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add stat
          </Button>
        )}
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="space-y-4 rounded-2xl border border-ink-900/10 p-5 dark:border-white/10">
          <StatFields draft={draft} onChange={setDraft} />
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Saving..." : "Add stat"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setAdding(false); setError(null); }}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {stats.map((stat) =>
          editingId === stat.id ? (
            <form
              key={stat.id}
              onSubmit={handleSaveEdit}
              className="space-y-4 rounded-2xl border border-ink-900/10 p-5 sm:col-span-2 dark:border-white/10"
            >
              <StatFields draft={editDraft} onChange={setEditDraft} />
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? "Saving..." : "Save changes"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingId(null); setError(null); }}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div
              key={stat.id}
              className="flex items-center gap-3 rounded-2xl border border-ink-900/10 p-4 dark:border-white/10"
            >
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl font-medium text-brand-600 dark:text-brand-400">
                  {stat.value}
                  {stat.suffix}
                </p>
                <p className="truncate text-sm text-ink-500 dark:text-white/50">{stat.label}</p>
              </div>
              <button
                type="button"
                onClick={() => startEdit(stat)}
                aria-label={`Edit ${stat.label}`}
                className="rounded-full p-2 text-ink-500 hover:bg-ink-900/5 dark:text-white/50 dark:hover:bg-white/10"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(stat.id)}
                aria-label={`Remove ${stat.label}`}
                className="rounded-full p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function StatFields({ draft, onChange }: { draft: StatDraft; onChange: (d: StatDraft) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <label className="block sm:col-span-2">
        <span className="mb-1.5 block text-sm font-medium">Label</span>
        <Input
          value={draft.label}
          onChange={(e) => onChange({ ...draft, label: e.target.value })}
          required
          placeholder="Active Members"
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Value</span>
        <Input
          type="number"
          value={draft.value}
          onChange={(e) => onChange({ ...draft, value: e.target.value })}
          required
          placeholder="520"
        />
      </label>
      <label className="block sm:col-span-3">
        <span className="mb-1.5 block text-sm font-medium">Suffix (optional)</span>
        <Input
          value={draft.suffix}
          onChange={(e) => onChange({ ...draft, suffix: e.target.value })}
          placeholder="+"
          className="max-w-[120px]"
        />
      </label>
    </div>
  );
}
