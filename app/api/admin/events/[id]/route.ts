import { NextResponse } from "next/server";
import { deleteEvent, updateEvent } from "@/lib/content-store";
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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const patch: Partial<ChapterEvent> = {};

  for (const field of ["title", "date", "location", "description"] as const) {
    if (body[field] !== undefined) patch[field] = String(body[field]);
  }
  if (body.status !== undefined) {
    if (!EVENT_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (Array.isArray(body.tags)) {
    patch.tags = sanitizeTags(body.tags);
  }
  if (body.registrationUrl !== undefined) {
    const trimmed = String(body.registrationUrl).trim();
    if (trimmed && !isValidUrl(trimmed)) {
      return NextResponse.json(
        { error: "Registration link must be a valid http(s) URL." },
        { status: 400 }
      );
    }
    patch.registrationUrl = trimmed || undefined;
  }
  if (body.notifyOnHomepage !== undefined) {
    patch.notifyOnHomepage = !!body.notifyOnHomepage;
  }

  const updated = await updateEvent(params.id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  await deleteEvent(params.id);
  return NextResponse.json({ ok: true });
}
