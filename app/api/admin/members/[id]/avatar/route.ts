import { NextResponse } from "next/server";
import { clearMemberAvatar } from "@/lib/content-store";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

/**
 * Removes a member's photo (deletes the uploaded file and clears the
 * field) without deleting the member themselves. The member's tile
 * falls back to their initials avatar everywhere on the site. Viewing
 * a member's avatar doesn't need its own endpoint — the members list
 * (GET /api/admin/members) already includes each member's `avatar`
 * path, which the admin dashboard renders full-size in a lightbox.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const updated = await clearMemberAvatar(params.id);
  if (!updated) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  return NextResponse.json(updated);
}
