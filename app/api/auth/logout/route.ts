import { NextResponse } from "next/server";
import { SESSION_COOKIES } from "@/lib/session";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIES.member, "", { path: "/", maxAge: 0 });
  return response;
}
