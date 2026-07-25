"use client";

import { useEffect, useState } from "react";
import { SectionHeading } from "@/components/section-heading";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EventCard } from "@/components/events/event-card";
import { EventDetailDialog } from "@/components/events/event-detail-dialog";
import { ChapterEvent, EventStatus } from "@/lib/types";

const FILTERS: { value: EventStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "live", label: "Live" },
  { value: "past", label: "Past" },
];

interface EventsSectionProps {
  events: ChapterEvent[];
}

export function EventsSection({ events }: EventsSectionProps) {
  const [filter, setFilter] = useState<EventStatus | "all">("all");
  const [selected, setSelected] = useState<ChapterEvent | null>(null);

  // Opens straight to the right event when someone follows a shared
  // link (see lib/share.ts) — e.g. "yoursite.com/?event=e-01#events".
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("event");
    if (!id) return;
    const match = events.find((e) => e.id === id);
    if (match) setSelected(match);
    // Only meant to run once, against whatever the URL looked like on
    // first load — not on every events/filter change afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = events.filter((e) => filter === "all" || e.status === filter);

  return (
    <section id="events" className="section-pad bg-white dark:bg-surface-darkRaised">
      <div className="container">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow="Events"
            title="Workshops, contests, and everything running right now."
          />
          <Tabs value={filter} onValueChange={(v) => setFilter(v as EventStatus | "all")}>
            <TabsList>
              {FILTERS.map((f) => (
                <TabsTrigger key={f.value} value={f.value}>
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((event) => (
            <EventCard key={event.id} event={event} onSelect={setSelected} />
          ))}
        </div>

        {visible.length === 0 && (
          <p className="mt-10 text-center text-sm text-ink-500 dark:text-white/50">
            No events in this category yet.
          </p>
        )}
      </div>

      <EventDetailDialog event={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </section>
  );
}
