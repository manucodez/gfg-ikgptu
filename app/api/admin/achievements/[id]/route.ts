import { NextResponse } from "next/server";
import { deleteAchievement, updateAchievement } from "@/lib/content-store";
import { parseDateValue } from "@/lib/utils";
import type { Achievement } from "@/lib/types";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const patch: Partial<Achievement> = {};

  if (body.date !== undefined && parseDateValue(String(body.date)) === -Infinity) {
    return NextResponse.json({ error: "Enter a valid date." }, { status: 400 });
  }

  for (const field of ["title", "description", "date"] as const) {
    if (body[field] !== undefined) patch[field] = String(body[field]);
  }

  const updated = await updateAchievement(params.id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Achievement not found." }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  await deleteAchievement(params.id);
  return NextResponse.json({ ok: true });
}
