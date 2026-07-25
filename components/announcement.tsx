import { Megaphone, ArrowRight } from "lucide-react";
import { ChapterEvent } from "@/lib/types";

interface AnnouncementProps {
  /** Events an admin has flagged with "Add this notification to page". */
  events: ChapterEvent[];
}

/** Homepage banner strip — one card per event an admin has flagged as
 *  a notification. Renders nothing at all when there's nothing to
 *  announce, rather than showing stale placeholder copy. */
export function Announcement({ events }: AnnouncementProps) {
  if (events.length === 0) return null;

  return (
    <div className="container -mt-8 space-y-3 sm:-mt-10">
      {events.map((event) => (
        <div
          key={event.id}
          className="card-surface flex flex-col gap-3 border-brand-200 bg-brand-50/60 p-5 dark:border-brand-900/40 dark:bg-brand-900/20 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
              <Megaphone className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium">{event.title}</p>
              <p className="text-sm text-ink-500 dark:text-white/50">
                {event.date} · {event.location}
              </p>
            </div>
          </div>
          <a
            href={`?event=${event.id}#events`}
            className="flex items-center gap-1 self-start whitespace-nowrap text-sm font-medium text-brand-700 dark:text-brand-400 sm:self-auto"
          >
            View details <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      ))}
    </div>
  );
}
