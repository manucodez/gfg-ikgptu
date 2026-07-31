import { NextResponse } from "next/server";
import {
  deleteGalleryItem,
  getGalleryItemById,
  updateGalleryItem,
  saveUploadedImage,
  deleteUploadedImage,
} from "@/lib/content-store";
import type { GalleryItem } from "@/lib/types";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

// FormData now (not JSON) so an admin can optionally swap in a new
// photo in the same edit, alongside caption/category/description.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const patch: Partial<GalleryItem> = {};

  const caption = formData.get("caption");
  if (caption !== null) {
    const trimmed = String(caption).trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Caption can't be empty." }, { status: 400 });
    }
    patch.caption = trimmed;
  }

  const category = formData.get("category");
  if (category !== null) {
    const trimmed = String(category).trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Category can't be empty." }, { status: 400 });
    }
    patch.category = trimmed;
  }

  const description = formData.get("description");
  if (description !== null) {
    patch.description = String(description).trim() || undefined;
  }

  // Replacing the photo: upload the new one, and remember the old
  // one so it can be cleaned up from Cloudinary once the swap is
  // confirmed to have actually saved (below) — unlike deleting a
  // gallery item outright, replacing it means the old file is
  // definitely no longer needed by anything, so it's safe to remove
  // right away instead of leaving it to accumulate.
  const imageFile = formData.get("imageFile");
  let previousImage: string | undefined;
  if (imageFile instanceof File && imageFile.size > 0) {
    previousImage = (await getGalleryItemById(params.id))?.image;
    patch.image = await saveUploadedImage(imageFile, "gallery");
  }

  const updated = await updateGalleryItem(params.id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  if (previousImage) {
    await deleteUploadedImage(previousImage).catch(() => {});
  }

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  await deleteGalleryItem(params.id);
  return NextResponse.json({ ok: true });
}
