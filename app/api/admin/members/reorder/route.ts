import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
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

  try {
    await reorderMembers(orderedIds);
  } catch (error) {
    // Most likely cause: one of these ids was deleted by another
    // admin between this list loading in the browser and the drag
    // landing here — reorderMembers updates every id in one
    // transaction, so a single missing row (Prisma error P2025) rolls
    // the whole reorder back rather than partially applying it. The
    // client reloads the current list from the server on any non-2xx
    // response here, which self-heals this case automatically.
    console.error("Failed to save member order:", error);
    return NextResponse.json(
      { error: "Couldn't save the new order — reloading the current list." },
      { status: 409 }
    );
  }

  // The homepage reads members straight from the database on every
  // request (it's `force-dynamic`), so a hard reload already shows
  // the new order — but Next's client-side router cache can still
  // serve a stale cached copy of "/" when the admin navigates there
  // with a normal link/back-navigation instead of a full reload.
  // revalidatePath clears that cache entry so the new order shows up
  // immediately on next visit, not just after a manual refresh.
  revalidatePath("/");

  return NextResponse.json({ ok: true });
}
