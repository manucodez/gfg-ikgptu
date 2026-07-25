import { NextResponse } from "next/server";
import { addStat, getStats } from "@/lib/content-store";
import type { StatItem } from "@/lib/types";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await getStats();
  return NextResponse.json(stats);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { label, value, suffix } = body ?? {};

  if (!label || value === undefined || value === null || value === "") {
    return NextResponse.json(
      { error: "Label and value are required." },
      { status: 400 }
    );
  }
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return NextResponse.json({ error: "Value must be a number." }, { status: 400 });
  }

  const stat: StatItem = {
    id: `s-${Date.now().toString(36)}`,
    label: String(label),
    value: numericValue,
    suffix: suffix ? String(suffix) : undefined,
  };

  await addStat(stat);
  return NextResponse.json(stat, { status: 201 });
}
