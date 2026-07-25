import { NextResponse } from "next/server";
import { deleteStat, updateStat } from "@/lib/content-store";
import type { StatItem } from "@/lib/types";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const patch: Partial<StatItem> = {};

  if (body.label !== undefined) patch.label = String(body.label);
  if (body.value !== undefined) {
    const numericValue = Number(body.value);
    if (!Number.isFinite(numericValue)) {
      return NextResponse.json({ error: "Value must be a number." }, { status: 400 });
    }
    patch.value = numericValue;
  }
  if (body.suffix !== undefined) patch.suffix = body.suffix ? String(body.suffix) : undefined;

  const updated = await updateStat(params.id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Stat not found." }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  await deleteStat(params.id);
  return NextResponse.json({ ok: true });
}
