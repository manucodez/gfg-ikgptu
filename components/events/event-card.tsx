"use client";

import { CalendarDays, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChapterEvent } from "@/lib/types";

export const STATUS_LABEL: Record<ChapterEvent["status"], string> = {
  upcoming: "Upcoming",
  live: "Live",
  past: "Past",
};

interface EventCardProps {
  event: ChapterEvent;
  onSelect: (event: ChapterEvent) => void;
}

export function EventCard({ event, onSelect }: EventCardProps) {
  return (
    <button type="button" onClick={() => onSelect(event)} className="block w-full text-left">
      <Card className="transition-shadow hover:shadow-raised">
        <CardContent>
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-lg font-medium">{event.title}</h3>
            <Badge tone={event.status === "live" ? "live" : event.status === "past" ? "past" : "brand"}>
              {STATUS_LABEL[event.status]}
            </Badge>
          </div>

          <p className="mt-3 text-sm text-ink-500 dark:text-white/60">{event.description}</p>

          <div className="mt-4 space-y-1.5 text-sm text-ink-700 dark:text-white/70">
            <p className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              {event.date}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              {event.location}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {event.tags.map((tag) => (
              <Badge key={tag} tone="neutral">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
