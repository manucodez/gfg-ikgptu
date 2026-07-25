import { NextResponse } from "next/server";
import { deleteGalleryItem, updateGalleryItem } from "@/lib/content-store";
import type { GalleryItem } from "@/lib/types";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const patch: Partial<GalleryItem> = {};

  if (body.caption !== undefined) {
    const caption = String(body.caption).trim();
    if (!caption) {
      return NextResponse.json({ error: "Caption can't be empty." }, { status: 400 });
    }
    patch.caption = caption;
  }
  if (body.category !== undefined) {
    const category = String(body.category).trim();
    if (!category) {
      return NextResponse.json({ error: "Category can't be empty." }, { status: 400 });
    }
    patch.category = category;
  }
  if (body.description !== undefined) {
    patch.description = String(body.description).trim() || undefined;
  }

  const updated = await updateGalleryItem(params.id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  await deleteGalleryItem(params.id);
  return NextResponse.json({ ok: true });
}
