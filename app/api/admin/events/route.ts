import { NextResponse } from "next/server";
import { addEvent, getEvents } from "@/lib/content-store";
import { isValidUrl } from "@/lib/validation";
import { EVENT_STATUSES, type ChapterEvent } from "@/lib/types";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

/** Trims, drops blanks/duplicates (case-insensitively), and caps both
 *  the count and the length of each tag — event tags are free text
 *  now (suggested presets + admin-typed custom ones), so this is the
 *  actual validation instead of a fixed-list filter. */
function sanitizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const raw of tags) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim().slice(0, 30);
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    clean.push(trimmed);
    if (clean.length >= 10) break;
  }
  return clean;
}

export async function GET() {
  const events = await getEvents();
  return NextResponse.json(events);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { title, date, location, description, status, tags, registrationUrl, notifyOnHomepage } =
    body ?? {};

  if (!title || !date || !location) {
    return NextResponse.json(
      { error: "Title, date, and location are required." },
      { status: 400 }
    );
  }
  if (status && !EVENT_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  const cleanRegistrationUrl = String(registrationUrl ?? "").trim();
  if (cleanRegistrationUrl && !isValidUrl(cleanRegistrationUrl)) {
    return NextResponse.json(
      { error: "Registration link must be a valid http(s) URL." },
      { status: 400 }
    );
  }
  const cleanTags = sanitizeTags(tags);

  const event: ChapterEvent = {
    id: `e-${Date.now().toString(36)}`,
    title: String(title),
    date: String(date),
    location: String(location),
    description: String(description ?? ""),
    status: status ?? "upcoming",
    tags: cleanTags,
    registrationUrl: cleanRegistrationUrl || undefined,
    notifyOnHomepage: !!notifyOnHomepage,
  };

  await addEvent(event);
  return NextResponse.json(event, { status: 201 });
}
