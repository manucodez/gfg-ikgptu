import { parseEventDateString } from "@/lib/utils";
import type { ChapterEvent } from "@/lib/types";

/** Escapes text per RFC 5545 §3.3.11 — commas, semicolons, backslashes
 *  and newlines all need escaping inside an ICS text value. */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Folds a line to the 75-octet limit RFC 5545 requires, continuing
 *  with a space on the next line — most calendar apps are lenient
 *  about this, but Outlook in particular can mis-render long
 *  unfolded lines, so it's worth doing properly. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = " " + rest.slice(75);
  }
  parts.push(rest);
  return parts.join("\r\n");
}

function toIcsDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

/** One day after `isoDate` — DTEND on an all-day iCalendar event is
 *  exclusive, so a single-day event ending "on" the 18th needs
 *  DTEND=19th, and a 12–16 Aug range needs DTEND=17 Aug. */
function dayAfter(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Builds a complete .ics file for one event, or null if the event's
 * `date` field doesn't match either of the two formats
 * parseEventDateString understands (a single day, or a day range) —
 * this deliberately never guesses at a date for the small number of
 * events stored with a free-text/custom date (e.g. "Every Sunday,
 * 6 PM"), since a wrong calendar entry is worse than no "Add to
 * calendar" button at all.
 */
export function buildEventIcs(event: ChapterEvent, siteUrl: string): string | null {
  const parsed = parseEventDateString(event.date);
  if (parsed.mode === "custom" || !parsed.start) return null;

  const startDate = toIcsDate(parsed.start);
  const endDate = toIcsDate(dayAfter(parsed.end ?? parsed.start));
  // A stable UID per event, not regenerated per download, so
  // re-downloading and re-importing the same event updates the
  // existing calendar entry instead of duplicating it.
  const uid = `event-${event.id}@gfg-ikgptu`;
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GFG IKGPTU//Chapter Events//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${startDate}`,
    `DTEND;VALUE=DATE:${endDate}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
    ...(event.description
      ? [`DESCRIPTION:${escapeIcsText(`${event.description}\n\n${siteUrl}`)}`]
      : [`DESCRIPTION:${escapeIcsText(siteUrl)}`]),
    ...(event.registrationUrl ? [`URL:${event.registrationUrl}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
