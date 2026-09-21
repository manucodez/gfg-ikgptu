import { NextResponse } from "next/server";
import { getOverviewStats } from "@/lib/content-store";

// Protected by middleware.ts like every other /api/admin/* route.
export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await getOverviewStats();
  return NextResponse.json(stats);
}
