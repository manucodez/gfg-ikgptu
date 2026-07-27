"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EventForm } from "@/components/admin/event-form";
import { ChapterEvent } from "@/lib/types";

export function EventsPanel() {
  const [events, setEvents] = useState<ChapterEvent[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/events");
    setEvents(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this event?")) return;
    await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    load();
  }

  async function handleToggleNotify(event: ChapterEvent) {
    setTogglingId(event.id);
    await fetch(`/api/admin/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifyOnHomepage: !event.notifyOnHomepage }),
    });
    await load();
    setTogglingId(null);
  }

  if (!events) return <p className="text-sm text-ink-500 dark:text-white/50">Loading events...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-white/50">{events.length} events</p>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add event
          </Button>
        )}
      </div>

      {adding && (
        <EventForm
          onDone={() => {
            setAdding(false);
            load();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      <div className="space-y-3">
        {events.map((event) =>
          editingId === event.id ? (
            <EventForm
              key={event.id}
              initial={event}
              onDone={() => {
                setEditingId(null);
                load();
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div
              key={event.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-ink-900/10 p-4 dark:border-white/10"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{event.title}</p>
                  <Badge tone={event.status === "live" ? "live" : event.status === "past" ? "past" : "brand"}>
                    {event.status}
                  </Badge>
                  {!event.registrationUrl && (
                    <span className="text-[11px] text-ink-500 dark:text-white/40">no registration link yet</span>
                  )}
                </div>
                <p className="mt-1 text-sm text-ink-500 dark:text-white/50">
                  {event.date} · {event.location}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => handleToggleNotify(event)}
                  disabled={togglingId === event.id}
                  aria-label={
                    event.notifyOnHomepage
                      ? `Remove ${event.title} from homepage notifications`
                      : `Show ${event.title} as a homepage notification`
                  }
                  title={event.notifyOnHomepage ? "Showing on homepage — click to remove" : "Not shown on homepage"}
                  className={`rounded-full p-2 ${
                    event.notifyOnHomepage
                      ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400"
                      : "text-ink-500 hover:bg-ink-900/5 dark:text-white/50 dark:hover:bg-white/10"
                  }`}
                >
                  <Megaphone className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(event.id)}
                  aria-label={`Edit ${event.title}`}
                  className="rounded-full p-2.5 text-ink-500 hover:bg-ink-900/5 dark:text-white/50 dark:hover:bg-white/10"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(event.id)}
                  aria-label={`Delete ${event.title}`}
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
