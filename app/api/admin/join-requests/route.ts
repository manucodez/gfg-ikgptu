import { NextResponse } from "next/server";
import { getJoinRequests } from "@/lib/content-store";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

// Auth is handled by middleware.ts for the whole /api/admin/* prefix —
// nothing to check here.
export async function GET() {
  const requests = await getJoinRequests();
  return NextResponse.json(requests);
}
