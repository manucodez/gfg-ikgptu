import { NextResponse } from "next/server";
import { bulkUpdateJoinRequestStatus, bulkDeleteJoinRequests } from "@/lib/content-store";
import type { JoinRequestStatus } from "@/lib/types";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

const VALID_STATUSES: JoinRequestStatus[] = ["new", "contacted", "archived"];

// Auth is handled by middleware.ts for the whole /api/admin/* prefix.
// This static "bulk" segment is matched before the dynamic
// [id]/route.ts sibling — Next.js always prefers a static route
// segment over a dynamic one at the same level.

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];
  const status = body?.status;

  if (ids.length === 0) {
    return NextResponse.json({ error: "No requests selected." }, { status: 400 });
  }
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const count = await bulkUpdateJoinRequestStatus(ids, status);
  return NextResponse.json({ ok: true, count });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string") : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "No requests selected." }, { status: 400 });
  }

  const count = await bulkDeleteJoinRequests(ids);
  return NextResponse.json({ ok: true, count });
}
