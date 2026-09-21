import { NextResponse } from "next/server";
import { getJoinRequestsPage, countNewJoinRequests } from "@/lib/content-store";
import type { JoinRequestStatus } from "@/lib/types";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

const VALID_STATUSES: JoinRequestStatus[] = ["new", "contacted", "archived"];

// Auth is handled by middleware.ts for the whole /api/admin/* prefix —
// nothing to check here.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(url.searchParams.get("pageSize") ?? "20") || 20;
  const statusParam = url.searchParams.get("status");
  const status = VALID_STATUSES.includes(statusParam as JoinRequestStatus)
    ? (statusParam as JoinRequestStatus)
    : undefined;

  const [page_, newCount] = await Promise.all([
    getJoinRequestsPage({ page, pageSize, status }),
    countNewJoinRequests(),
  ]);

  return NextResponse.json({ ...page_, newCount });
}
