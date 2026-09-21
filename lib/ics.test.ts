import { describe, it, expect } from "vitest";
import { buildEventIcs } from "./ics";
import type { ChapterEvent } from "./types";

const SITE_URL = "https://gfg-ikgptu.org";

function makeEvent(overrides: Partial<ChapterEvent>): ChapterEvent {
  return {
    id: "evt-1",
    title: "Intro to DSA Workshop",
    date: "18 Jul 2026",
    location: "CS Block, Room 204",
    description: "A hands-on session covering arrays, stacks, and queues.",
    status: "upcoming",
    tags: ["Workshop"],
    ...overrides,
  };
}

describe("buildEventIcs", () => {
  it("returns a well-formed VCALENDAR for a single-day event", () => {
    const ics = buildEventIcs(makeEvent({}), SITE_URL);
    expect(ics).not.toBeNull();
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:Intro to DSA Workshop");
    expect(ics).toContain("DTSTART;VALUE=DATE:20260718");
    // All-day DTEND is exclusive: one day after the event's actual day.
    expect(ics).toContain("DTEND;VALUE=DATE:20260719");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
    // RFC 5545 requires CRLF line endings.
    expect(ics).toMatch(/\r\n/);
  });

  it("uses an exclusive end date one day past the last day of a range", () => {
    const ics = buildEventIcs(makeEvent({ date: "12–16 Aug 2026" }), SITE_URL);
    expect(ics).toContain("DTSTART;VALUE=DATE:20260812");
    expect(ics).toContain("DTEND;VALUE=DATE:20260817");
  });

  it("returns null for a custom/free-text date that can't be parsed", () => {
    const ics = buildEventIcs(makeEvent({ date: "Every Sunday, 6 PM" }), SITE_URL);
    expect(ics).toBeNull();
  });

  it("escapes commas, semicolons, and backslashes in text fields", () => {
    const ics = buildEventIcs(
      makeEvent({ title: "Kickoff; Intro, Part 1 \\ Overview" }),
      SITE_URL
    );
    expect(ics).toContain("SUMMARY:Kickoff\\; Intro\\, Part 1 \\\\ Overview");
  });

  it("includes the registration URL when present", () => {
    const ics = buildEventIcs(
      makeEvent({ registrationUrl: "https://forms.gle/example" }),
      SITE_URL
    );
    expect(ics).toContain("URL:https://forms.gle/example");
  });

  it("omits URL when there's no registration link", () => {
    const ics = buildEventIcs(makeEvent({ registrationUrl: undefined }), SITE_URL);
    expect(ics).not.toContain("URL:");
  });

  it("gives every event a stable, unique UID derived from its id", () => {
    const icsA = buildEventIcs(makeEvent({ id: "evt-a" }), SITE_URL);
    const icsB = buildEventIcs(makeEvent({ id: "evt-b" }), SITE_URL);
    expect(icsA).toContain("UID:event-evt-a@gfg-ikgptu");
    expect(icsB).toContain("UID:event-evt-b@gfg-ikgptu");
  });
});
