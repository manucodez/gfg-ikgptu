import { NextResponse } from "next/server";
import { getChangeRequests } from "@/lib/content-store";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

export async function GET() {
  const requests = await getChangeRequests();
  // The admin Requests tab only ever displays previousEmail/newEmail —
  // it never needs the password hash, so it never leaves the server.
  const sanitized = requests.map((r) =>
    r.emailChange
      ? {
          ...r,
          emailChange: {
            previousEmail: r.emailChange.previousEmail,
            newEmail: r.emailChange.newEmail,
          },
        }
      : r
  );
  return NextResponse.json(sanitized);
}
