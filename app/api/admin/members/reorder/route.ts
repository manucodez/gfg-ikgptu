import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { reorderMembers, revalidateHomepageContent } from "@/lib/content-store";

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
    // Always logged server-side (visible in Vercel's function logs)
    // regardless of what else happens below.
    console.error("Failed to save member order:", error);

    // A Prisma error carries a short machine code (e.g. P2025 for "no
    // matching row") that's safe to show — it's not a stack trace or
    // connection string, just a category label. Surfacing it directly
    // in the response means the next failure (if any) is diagnosable
    // from the on-screen banner alone, without needing Vercel log
    // access to see what actually went wrong.
    const detail =
      error && typeof error === "object" && "code" in error
        ? ` (${(error as { code: unknown }).code})`
        : "";
    return NextResponse.json(
      { error: `Couldn't save the new order${detail} — reloading the current list.` },
      { status: 409 }
    );
  }

  // The homepage reads members via getPublicHomepageContent, which
  // caches the combined read for up to 60 seconds (see the comment on
  // that function in lib/content-store.ts) — revalidateHomepageContent
  // clears that cache entry so the new order is reflected immediately
  // rather than after that window elapses. revalidatePath additionally
  // clears Next's client-side router cache for "/", for an admin who
  // navigates there with a normal link/back-navigation instead of a
  // full reload.
  revalidateHomepageContent();
  revalidatePath("/");

  return NextResponse.json({ ok: true });
}
