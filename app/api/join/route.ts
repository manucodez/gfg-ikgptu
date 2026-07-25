import { NextResponse } from "next/server";
import { addJoinRequest } from "@/lib/content-store";
import { isValidEmail } from "@/lib/validation";
import type { JoinRequest } from "@/lib/types";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever. (This route is
// POST-only, but the convention is kept consistent across app/api/**.)
export const dynamic = "force-dynamic";

// Deliberately public — no session required, unlike everything under
// /api/admin and /api/member. Anyone on the homepage can submit this.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const branch = typeof body?.branch === "string" ? body.branch.trim() : "";
  const year = typeof body?.year === "string" ? body.year.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!name || !branch || !year) {
    return NextResponse.json({ error: "Name, branch, and year are required." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const joinRequest: JoinRequest = {
    id: `j-${Date.now().toString(36)}`,
    name,
    email,
    branch,
    year,
    message: message || undefined,
    submittedAt: new Date().toISOString(),
    status: "new",
  };

  await addJoinRequest(joinRequest);
  return NextResponse.json({ ok: true }, { status: 201 });
}
