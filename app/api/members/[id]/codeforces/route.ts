import { NextResponse } from "next/server";
import { getMemberById } from "@/lib/content-store";
import { getCodeforcesProfile } from "@/lib/codeforces";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Public — anyone viewing a member's profile can trigger this, same
// as viewing the profile itself. Rate-limited mainly to stop someone
// scripting this into a way to hammer Codeforces' API through us
// rather than to protect anything sensitive of our own.
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const ip = getClientIp(request);
  const { ok, retryAfterSeconds } = await checkRateLimit(`codeforces:ip:${ip}`, 60, 60_000);
  if (!ok) return rateLimitResponse(retryAfterSeconds ?? 60);

  const member = await getMemberById(params.id);
  if (!member || !member.codeforcesHandle) {
    return NextResponse.json({ profile: null });
  }

  const profile = await getCodeforcesProfile(member.codeforcesHandle);
  return NextResponse.json({ profile });
}
