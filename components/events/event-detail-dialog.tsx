"use client";

import { useState } from "react";
import { CalendarDays, MapPin, ExternalLink, Share2, Check } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChapterEvent } from "@/lib/types";
import { STATUS_LABEL } from "@/components/events/event-card";
import { shareEvent, type ShareResult } from "@/lib/share";

interface EventDetailDialogProps {
  event: ChapterEvent | null;
  onOpenChange: (open: boolean) => void;
}

export function EventDetailDialog({ event, onOpenChange }: EventDetailDialogProps) {
  const [sharing, setSharing] = useState(false);
  const [shareResult, setShareResult] = useState<ShareResult | null>(null);

  async function handleShare() {
    if (!event) return;
    setSharing(true);
    setShareResult(null);
    const shareUrl = `${window.location.origin}${window.location.pathname}?event=${event.id}#events`;
    const result = await shareEvent(event, shareUrl);
    setSharing(false);
    if (result.message) {
      setShareResult(result);
      setTimeout(() => setShareResult(null), 3500);
    }
  }

  return (
    <Dialog
      open={!!event}
      onOpenChange={(open) => {
        onOpenChange(open);
        if (!open) {
          setShareResult(null);
          setSharing(false);
        }
      }}
    >
      {event && (
        <DialogContent>
          <div className="p-6">
            <div className="flex items-start justify-between gap-3 pr-6">
              <DialogTitle className="font-display text-xl font-medium">{event.title}</DialogTitle>
              <Badge tone={event.status === "live" ? "live" : event.status === "past" ? "past" : "brand"}>
                {STATUS_LABEL[event.status]}
              </Badge>
            </div>

            <DialogDescription className="mt-2 text-sm leading-relaxed text-ink-500 dark:text-white/60">
              {event.description}
            </DialogDescription>

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

            <div className="mt-6 border-t border-ink-900/10 pt-5 dark:border-white/10">
              <div className="flex items-center gap-2">
                {event.registrationUrl ? (
                  <a
                    href={event.registrationUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand-700"
                  >
                    Register now <ExternalLink className="h-4 w-4" />
                  </a>
                ) : (
                  <span className="flex h-11 flex-1 items-center justify-center rounded-full border border-dashed border-ink-900/20 px-5 text-sm text-ink-500 dark:border-white/20 dark:text-white/50">
                    Registration link coming soon
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="Share this event"
                  title="Share"
                  disabled={sharing}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink-900/10 text-ink-500 hover:bg-ink-900/5 disabled:opacity-60 dark:border-white/10 dark:text-white/50 dark:hover:bg-white/10"
                >
                  {shareResult?.status === "copied" || shareResult?.status === "shared" ? (
                    <Check className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                </button>
              </div>
              {shareResult?.message && (
                <p className="mt-2.5 text-xs text-brand-700 dark:text-brand-400">{shareResult.message}</p>
              )}
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
