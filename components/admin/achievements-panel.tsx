"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Achievement } from "@/lib/types";
import { formatDisplayDate } from "@/lib/utils";

interface AchievementDraft {
  title: string;
  description: string;
  date: string;
}

const EMPTY_DRAFT: AchievementDraft = { title: "", description: "", date: "" };

export function AchievementsPanel() {
  const [achievements, setAchievements] = useState<Achievement[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<AchievementDraft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<AchievementDraft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/achievements");
    setAchievements(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/achievements", {
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
      setError(data.error ?? "Couldn't add this achievement.");
    }
    setLoading(false);
  }

  function startEdit(item: Achievement) {
    setEditingId(item.id);
    setEditDraft({ title: item.title, description: item.description, date: item.date });
    setError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/achievements/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editDraft),
    });
    if (res.ok) {
      setEditingId(null);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't save this achievement.");
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this achievement?")) return;
    await fetch(`/api/admin/achievements/${id}`, { method: "DELETE" });
    load();
  }

  if (!achievements) return <p className="text-sm text-ink-500 dark:text-white/50">Loading achievements...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-white/50">
          {achievements.length} achievements · sorted by date, most recent first
        </p>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add achievement
          </Button>
        )}
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="space-y-4 rounded-2xl border border-ink-900/10 p-5 dark:border-white/10">
          <AchievementFields draft={draft} onChange={setDraft} />
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Saving..." : "Add achievement"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setAdding(false); setError(null); }}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {achievements.map((item) =>
          editingId === item.id ? (
            <form
              key={item.id}
              onSubmit={handleSaveEdit}
              className="space-y-4 rounded-2xl border border-ink-900/10 p-5 dark:border-white/10"
            >
              <AchievementFields draft={editDraft} onChange={setEditDraft} />
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
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-ink-900/10 p-4 dark:border-white/10"
            >
              <div className="min-w-0">
                <p className="font-mono text-xs text-brand-600 dark:text-brand-400">{formatDisplayDate(item.date)}</p>
                <p className="mt-0.5 font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-ink-500 dark:text-white/50">{item.description}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  aria-label={`Edit ${item.title}`}
                  className="rounded-full p-2.5 text-ink-500 hover:bg-ink-900/5 dark:text-white/50 dark:hover:bg-white/10"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  aria-label={`Remove ${item.title}`}
                  className="rounded-full p-2.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function AchievementFields({
  draft,
  onChange,
}: {
  draft: AchievementDraft;
  onChange: (d: AchievementDraft) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-medium">Title</span>
          <Input
            value={draft.title}
            onChange={(e) => onChange({ ...draft, title: e.target.value })}
            required
            placeholder="Best Emerging Campus Chapter"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Date</span>
          <Input
            type="date"
            value={draft.date}
            onChange={(e) => onChange({ ...draft, date: e.target.value })}
            required
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Description</span>
        <Textarea
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          rows={2}
        />
      </label>
    </div>
  );
}
