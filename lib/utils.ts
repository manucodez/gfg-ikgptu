import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names safely, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** First letters of the first and last word of a name, for fallback avatars. */
export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// A small, fixed palette of brand-adjacent tones used to color
// initials-avatars deterministically, so the same name always
// gets the same tile color.
const AVATAR_TONES = [
  "bg-brand-600",
  "bg-brand-700",
  "bg-emerald-700",
  "bg-teal-700",
  "bg-lime-700",
  "bg-green-800",
];

export function getAvatarTone(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_TONES.length;
  return AVATAR_TONES[index];
}

/**
 * Turns a date string into a millisecond timestamp for sorting.
 * Handles the two shapes achievement dates can be in: a proper
 * `YYYY-MM-DD` (what the admin date picker produces going forward)
 * and a bare 4-digit year (what older records were stored as, back
 * when the field was free text). Anything unparseable sorts to the
 * very back rather than throwing, so one bad record can't break the
 * whole list's order.
 */
export function parseDateValue(date: string): number {
  if (!date) return -Infinity;
  if (/^\d{4}$/.test(date.trim())) {
    // Bare year — treat as 31 Dec so a same-year, more-specific date
    // (e.g. "2026-03-15") still sorts after it, most-recent-first.
    return new Date(`${date.trim()}-12-31`).getTime();
  }
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? -Infinity : parsed.getTime();
}

/** Formats a date for display as e.g. "15 Mar 2026". Falls back to
 *  the raw string unchanged if it can't be parsed (e.g. a bare year
 *  like "2026", or free text on an older/hand-edited record). */
export function formatDisplayDate(date: string): string {
  if (!date) return date;
  if (/^\d{4}$/.test(date.trim())) return date.trim();
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

const MONTH_ABBRS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Formats a single `YYYY-MM-DD` picker value or a start/end pair into
 *  the site's event-date convention — "18 Jul 2026" for a single day,
 *  "12–16 Aug 2026" for a same-month range, "28 Aug – 2 Sep 2026"
 *  across months, "30 Dec 2026 – 2 Jan 2027" across years. */
export function formatEventDateRange(startISO: string, endISO?: string): string {
  if (!startISO) return "";
  const start = new Date(`${startISO}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return "";
  if (!endISO || endISO === startISO) return formatDisplayDate(startISO);

  const end = new Date(`${endISO}T00:00:00Z`);
  if (Number.isNaN(end.getTime())) return formatDisplayDate(startISO);

  const day = (d: Date) => d.getUTCDate();
  const month = (d: Date) => MONTH_ABBRS[d.getUTCMonth()];
  const year = (d: Date) => d.getUTCFullYear();

  if (year(start) === year(end) && month(start) === month(end)) {
    return `${day(start)}–${day(end)} ${month(end)} ${year(end)}`;
  }
  if (year(start) === year(end)) {
    return `${day(start)} ${month(start)} – ${day(end)} ${month(end)} ${year(end)}`;
  }
  return `${day(start)} ${month(start)} ${year(start)} – ${day(end)} ${month(end)} ${year(end)}`;
}

export interface ParsedEventDate {
  mode: "single" | "range" | "custom";
  start?: string;
  end?: string;
}

/** Best-effort reverse of formatEventDateRange, used to pre-fill the
 *  edit form's date picker(s) from whatever's already stored. Older
 *  or irregular values (e.g. "Every Sunday, 6 PM") that don't match
 *  one of the recognized shapes fall back to `mode: "custom"` so the
 *  original text is preserved exactly rather than being mangled. */
export function parseEventDateString(raw: string): ParsedEventDate {
  const s = raw.trim();
  if (!s) return { mode: "single" };
  const M = MONTH_ABBRS.join("|");
  const toISO = (day: string, mon: string, year: string) => {
    const idx = MONTH_ABBRS.indexOf(mon);
    if (idx === -1) return undefined;
    return `${year}-${String(idx + 1).padStart(2, "0")}-${day.padStart(2, "0")}`;
  };

  let m = s.match(new RegExp(`^(\\d{1,2})\\s+(${M})\\s+(\\d{4})$`));
  if (m) {
    const start = toISO(m[1], m[2], m[3]);
    if (start) return { mode: "single", start };
  }

  m = s.match(new RegExp(`^(\\d{1,2})\\s*[–-]\\s*(\\d{1,2})\\s+(${M})\\s+(\\d{4})$`));
  if (m) {
    const start = toISO(m[1], m[3], m[4]);
    const end = toISO(m[2], m[3], m[4]);
    if (start && end) return { mode: "range", start, end };
  }

  m = s.match(new RegExp(`^(\\d{1,2})\\s+(${M})\\s*[–-]\\s*(\\d{1,2})\\s+(${M})\\s+(\\d{4})$`));
  if (m) {
    const start = toISO(m[1], m[2], m[5]);
    const end = toISO(m[3], m[4], m[5]);
    if (start && end) return { mode: "range", start, end };
  }

  m = s.match(new RegExp(`^(\\d{1,2})\\s+(${M})\\s+(\\d{4})\\s*[–-]\\s*(\\d{1,2})\\s+(${M})\\s+(\\d{4})$`));
  if (m) {
    const start = toISO(m[1], m[2], m[3]);
    const end = toISO(m[4], m[5], m[6]);
    if (start && end) return { mode: "range", start, end };
  }

  return { mode: "custom" };
}
