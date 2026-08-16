"use client";

import { useState } from "react";
import { Megaphone, Plus, X, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { EVENT_STATUSES, SUGGESTED_EVENT_TAGS, ChapterEvent, EventStatus, EventTag } from "@/lib/types";
import { formatEventDateRange, parseEventDateString, type ParsedEventDate } from "@/lib/utils";

interface EventFormProps {
  initial?: ChapterEvent;
  onDone: () => void;
  onCancel?: () => void;
}

export function EventForm({ initial, onDone, onCancel }: EventFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<EventStatus>(initial?.status ?? "upcoming");
  const [tags, setTags] = useState<EventTag[]>(initial?.tags ?? []);
  const [customTag, setCustomTag] = useState("");
  const [notifyOnHomepage, setNotifyOnHomepage] = useState(initial?.notifyOnHomepage ?? false);
  const isEdit = !!initial;

  // The date field supports three shapes an event can genuinely need:
  // a single day, a multi-day range, or free text for anything that
  // doesn't fit either (a recurring "Every Sunday, 6 PM" slot, say).
  // When editing, parseEventDateString reads back whichever of those
  // the stored value looks like, so the right picker(s) show up
  // already filled in instead of the admin having to retype it.
  const initialParsedDate: ParsedEventDate = initial?.date
    ? parseEventDateString(initial.date)
    : { mode: "single" };
  const [dateMode, setDateMode] = useState<ParsedEventDate["mode"]>(initialParsedDate.mode);
  const [dateStart, setDateStart] = useState(initialParsedDate.start ?? "");
  const [dateEnd, setDateEnd] = useState(initialParsedDate.end ?? initialParsedDate.start ?? "");
  const [customDate, setCustomDate] = useState(
    initialParsedDate.mode === "custom" ? initial?.date ?? "" : ""
  );
  const [dateError, setDateError] = useState<string | null>(null);

  const formattedDatePreview =
    dateMode === "custom"
      ? customDate.trim()
      : dateMode === "single"
        ? formatEventDateRange(dateStart)
        : formatEventDateRange(dateStart, dateEnd);

  function toggleTag(tag: EventTag) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function addCustomTag() {
    const trimmed = customTag.trim();
    if (!trimmed) return;
    setTags((prev) =>
      prev.some((t) => t.toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, trimmed]
    );
    setCustomTag("");
  }

  function removeTag(tag: EventTag) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  // Tags on this event that aren't one of the one-click suggestions —
  // either typed in here, or already on the record from before (an
  // older event, or one edited by hand). Rendered as removable chips
  // of their own, separately from the suggested-tag toggle buttons.
  const customTagsOnEvent = tags.filter(
    (t) => !SUGGESTED_EVENT_TAGS.some((s) => s.toLowerCase() === t.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDateError(null);

    let date: string;
    if (dateMode === "custom") {
      date = customDate.trim();
      if (!date) {
        setDateError("Enter the date text to show for this event.");
        return;
      }
    } else if (dateMode === "single") {
      if (!dateStart) {
        setDateError("Pick a date.");
        return;
      }
      date = formatEventDateRange(dateStart);
    } else {
      if (!dateStart || !dateEnd) {
        setDateError("Pick both a start and end date.");
        return;
      }
      if (dateEnd < dateStart) {
        setDateError("End date can't be before the start date.");
        return;
      }
      date = formatEventDateRange(dateStart, dateEnd);
    }

    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const body = {
      title: form.get("title"),
      date,
      location: form.get("location"),
      description: form.get("description"),
      status,
      tags,
      registrationUrl: form.get("registrationUrl"),
      notifyOnHomepage,
    };

    const url = isEdit ? `/api/admin/events/${initial!.id}` : "/api/admin/events";
    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      onDone();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't save this event.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-ink-900/10 p-5 dark:border-white/10">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <Input name="title" defaultValue={initial?.title} required />
        </Field>
        <Field label="Location">
          <Input name="location" defaultValue={initial?.location} required />
        </Field>
      </div>

      <div>
        <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
          <CalendarDays className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
          Date
        </span>
        <div className="mb-2 flex flex-wrap gap-2">
          {(["single", "range", "custom"] as const).map((mode) => (
            <button
              type="button"
              key={mode}
              onClick={() => setDateMode(mode)}
              className={`rounded-full px-3 py-1.5 text-sm capitalize transition-colors ${
                dateMode === mode
                  ? "bg-brand-600 text-white"
                  : "bg-ink-900/5 text-ink-700 dark:bg-white/10 dark:text-white/70"
              }`}
            >
              {mode === "single" ? "Single day" : mode === "range" ? "Multi-day range" : "Custom text"}
            </button>
          ))}
        </div>

        {dateMode === "single" && (
          <Input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            required
          />
        )}

        {dateMode === "range" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-ink-500 dark:text-white/40">From</span>
              <Input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-ink-500 dark:text-white/40">To</span>
              <Input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                required
              />
            </label>
          </div>
        )}

        {dateMode === "custom" && (
          <Input
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            placeholder="Every Sunday, 6 PM"
            required
          />
        )}

        {dateMode !== "custom" && (
          <span className="mt-1 block text-xs text-ink-500 dark:text-white/40">
            {formattedDatePreview
              ? `Will show as: ${formattedDatePreview}`
              : "For anything recurring or that doesn't fit a date/date-range, switch to \u201cCustom text.\u201d"}
          </span>
        )}
        {dateError && (
          <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{dateError}</p>
        )}
      </div>
      <Field label="Description">
        <Textarea name="description" defaultValue={initial?.description} rows={2} />
      </Field>
      <Field label="Registration link (Google Form or other URL, optional)">
        <Input
          name="registrationUrl"
          type="url"
          defaultValue={initial?.registrationUrl}
          placeholder="https://forms.gle/..."
        />
        <span className="mt-1 block text-xs text-ink-500 dark:text-white/40">
          Shown as a &quot;Register now&quot; button when someone opens this event on the site.
          Leave blank to show &quot;coming soon&quot; until it&apos;s ready.
        </span>
      </Field>

      <div>
        <span className="mb-1.5 block text-sm font-medium">Status</span>
        <div className="flex flex-wrap gap-2">
          {EVENT_STATUSES.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-3 py-1.5 text-sm capitalize transition-colors ${
                status === s
                  ? "bg-brand-600 text-white"
                  : "bg-ink-900/5 text-ink-700 dark:bg-white/10 dark:text-white/70"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium">Tags</span>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_EVENT_TAGS.map((tag) => (
            <button
              type="button"
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                tags.includes(tag)
                  ? "bg-brand-600 text-white"
                  : "bg-ink-900/5 text-ink-700 dark:bg-white/10 dark:text-white/70"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {customTagsOnEvent.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {customTagsOnEvent.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1.5 text-sm text-brand-700 dark:bg-brand-900/40 dark:text-brand-400"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove ${tag} tag`}
                  className="text-brand-700/70 hover:text-brand-700 dark:text-brand-400/70 dark:hover:text-brand-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="mt-2 flex gap-2">
          <Input
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomTag();
              }
            }}
            placeholder="Add a custom tag…"
            className="h-9 max-w-[220px] text-base sm:text-sm"
          />
          <Button type="button" variant="outline" size="sm" onClick={addCustomTag}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
        <span className="mt-1 block text-xs text-ink-500 dark:text-white/40">
          Pick from the suggestions above, or type your own and press Enter / Add.
        </span>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-900/10 p-3 dark:border-white/10">
        <input
          type="checkbox"
          checked={notifyOnHomepage}
          onChange={(e) => setNotifyOnHomepage(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-ink-900/30 text-brand-600 focus:ring-brand-500 dark:border-white/30"
        />
        <span>
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Megaphone className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
            Add this notification to page
          </span>
          <span className="mt-0.5 block text-xs text-ink-500 dark:text-white/40">
            Shows a banner for this event just below the homepage header. Uncheck anytime to take it down.
          </span>
        </span>
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Saving..." : isEdit ? "Save changes" : "Add event"}
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
