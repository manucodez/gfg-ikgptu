import { getEvents } from "@/lib/content-store";
import { buildEventIcs } from "@/lib/ics";

export const dynamic = "force-dynamic";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const events = await getEvents();
  const event = events.find((e) => e.id === params.id);
  if (!event) {
    return Response.json({ error: "Event not found." }, { status: 404 });
  }

  const ics = buildEventIcs(event, siteUrl);
  if (!ics) {
    return Response.json(
      { error: "This event's date isn't in a format that can be added to a calendar." },
      { status: 422 }
    );
  }

  const filename = `${event.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
