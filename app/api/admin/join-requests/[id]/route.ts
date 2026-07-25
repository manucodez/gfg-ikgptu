import { NextResponse } from "next/server";
import { deleteJoinRequest, updateJoinRequestStatus } from "@/lib/content-store";
import type { JoinRequestStatus } from "@/lib/types";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever. (No GET here,
// but the convention is kept consistent across app/api/**.)
export const dynamic = "force-dynamic";

const VALID_STATUSES: JoinRequestStatus[] = ["new", "contacted", "archived"];

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);
  const status = body?.status;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const updated = await updateJoinRequestStatus(params.id, status);
  if (!updated) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  await deleteJoinRequest(params.id);
  return NextResponse.json({ ok: true });
}
