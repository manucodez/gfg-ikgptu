"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { GalleryItem } from "@/lib/types";

interface EditDraft {
  caption: string;
  category: string;
  description: string;
}

export function GalleryPanel() {
  const [items, setItems] = useState<GalleryItem[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft>({ caption: "", category: "", description: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/gallery");
    setItems(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const res = await fetch("/api/admin/gallery", { method: "POST", body: formData });
    if (res.ok) {
      setAdding(false);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't add this photo.");
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this photo from the gallery?")) return;
    await fetch(`/api/admin/gallery/${id}`, { method: "DELETE" });
    load();
  }

  function startEdit(item: GalleryItem) {
    setEditingId(item.id);
    setEditDraft({
      caption: item.caption,
      category: item.category,
      description: item.description ?? "",
    });
    setEditError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditLoading(true);
    setEditError(null);
    const res = await fetch(`/api/admin/gallery/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editDraft),
    });
    if (res.ok) {
      setEditingId(null);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setEditError(data.error ?? "Couldn't save this photo.");
    }
    setEditLoading(false);
  }

  if (!items) return <p className="text-sm text-ink-500 dark:text-white/50">Loading gallery...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-white/50">{items.length} photos</p>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add photo
          </Button>
        )}
      </div>

      {adding && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-ink-900/10 p-5 dark:border-white/10"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Caption</span>
              <Input name="caption" required placeholder="Hackathon Finalists" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Category</span>
              <Input name="category" required placeholder="Hackathon" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Description (optional)</span>
            <Textarea
              name="description"
              rows={2}
              placeholder="A line or two of context for this photo — who, what, when."
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Photo</span>
            <input
              type="file"
              name="imageFile"
              accept="image/*"
              required
              className="block w-full text-sm text-ink-500 file:mr-3 file:rounded-full file:border-0 file:bg-brand-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 dark:text-white/50 dark:file:bg-brand-900/40 dark:file:text-brand-400"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? "Uploading..." : "Add photo"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {editingId && (
        <form
          onSubmit={handleSaveEdit}
          className="space-y-4 rounded-2xl border border-ink-900/10 p-5 dark:border-white/10"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Caption</span>
              <Input
                value={editDraft.caption}
                onChange={(e) => setEditDraft({ ...editDraft, caption: e.target.value })}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Category</span>
              <Input
                value={editDraft.category}
                onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
                required
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Description (optional)</span>
            <Textarea
              value={editDraft.description}
              onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
              rows={2}
              placeholder="A line or two of context for this photo — who, what, when."
            />
          </label>

          {editError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
              {editError}
            </p>
          )}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={editLoading}>
              {editLoading ? "Saving..." : "Save changes"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.id} className="group relative overflow-hidden rounded-xl border border-ink-900/10 dark:border-white/10">
            {item.image ? (
              <div className="relative aspect-square">
                <Image src={item.image} alt={item.caption} fill sizes="150px" className="object-cover" />
              </div>
            ) : (
              <div className="flex aspect-square flex-col items-center justify-center gap-1 bg-ink-900/[0.04] p-2 text-center dark:bg-white/5">
                <ImageIcon className="h-5 w-5 text-ink-500 dark:text-white/40" />
                <span className="truncate text-[10px] text-ink-500 dark:text-white/40">{item.caption}</span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
              <p className="truncate text-[11px] font-medium text-white">{item.caption}</p>
              {item.description && (
                <p className="line-clamp-2 text-[10px] text-white/70">{item.description}</p>
              )}
            </div>
            <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => startEdit(item)}
                aria-label={`Edit ${item.caption}`}
                className="rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                aria-label={`Remove ${item.caption}`}
                className="rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
