import { NextResponse } from "next/server";
import { reorderMembers } from "@/lib/content-store";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever. (No GET here,
// but the convention is kept consistent across app/api/**.)
export const dynamic = "force-dynamic";

// Auth is handled by middleware.ts for the whole /api/admin/* prefix —
// nothing to check here.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const orderedIds = body?.orderedIds;

  if (!Array.isArray(orderedIds) || !orderedIds.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "orderedIds must be an array of member ids." }, { status: 400 });
  }

  await reorderMembers(orderedIds);
  return NextResponse.json({ ok: true });
}
