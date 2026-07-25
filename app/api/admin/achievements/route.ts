import { NextResponse } from "next/server";
import { addAchievement, getAchievements } from "@/lib/content-store";
import { parseDateValue } from "@/lib/utils";
import type { Achievement } from "@/lib/types";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

export async function GET() {
  const achievements = await getAchievements();
  return NextResponse.json(achievements);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { title, description, date } = body ?? {};

  if (!title || !date) {
    return NextResponse.json(
      { error: "Title and date are required." },
      { status: 400 }
    );
  }
  if (parseDateValue(String(date)) === -Infinity) {
    return NextResponse.json(
      { error: "Enter a valid date." },
      { status: 400 }
    );
  }

  const achievement: Achievement = {
    id: `a-${Date.now().toString(36)}`,
    title: String(title),
    description: String(description ?? ""),
    date: String(date),
  };

  await addAchievement(achievement);
  return NextResponse.json(achievement, { status: 201 });
}
