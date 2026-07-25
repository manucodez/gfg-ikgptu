import { NextResponse } from "next/server";
import { addGalleryItem, getGalleryItems, saveUploadedImage } from "@/lib/content-store";
import type { GalleryItem } from "@/lib/types";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await getGalleryItems();
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const caption = String(formData.get("caption") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!caption || !category) {
    return NextResponse.json(
      { error: "Caption and category are required." },
      { status: 400 }
    );
  }

  let image: string | undefined;
  const imageFile = formData.get("imageFile");
  if (imageFile instanceof File && imageFile.size > 0) {
    image = await saveUploadedImage(imageFile, "gallery");
  }

  const item: GalleryItem = {
    id: `g-${Date.now().toString(36)}`,
    caption,
    category,
    description: description || undefined,
    image,
  };

  await addGalleryItem(item);
  return NextResponse.json(item, { status: 201 });
}
