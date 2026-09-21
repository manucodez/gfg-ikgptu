import { describe, it, expect } from "vitest";
import { formatEventDateRange, parseEventDateString } from "./utils";

describe("formatEventDateRange", () => {
  it("formats a single day", () => {
    expect(formatEventDateRange("2026-07-18")).toBe("18 Jul 2026");
  });

  it("formats a same-month range", () => {
    expect(formatEventDateRange("2026-08-12", "2026-08-16")).toBe("12–16 Aug 2026");
  });

  it("formats a cross-month range within the same year", () => {
    expect(formatEventDateRange("2026-08-28", "2026-09-02")).toBe("28 Aug – 2 Sep 2026");
  });

  it("formats a cross-year range", () => {
    expect(formatEventDateRange("2026-12-30", "2027-01-02")).toBe("30 Dec 2026 – 2 Jan 2027");
  });

  it("treats an identical start/end as a single day", () => {
    expect(formatEventDateRange("2026-07-18", "2026-07-18")).toBe("18 Jul 2026");
  });

  it("returns an empty string for an empty start date", () => {
    expect(formatEventDateRange("")).toBe("");
  });
});

describe("parseEventDateString", () => {
  it("round-trips a single day through formatEventDateRange", () => {
    const formatted = formatEventDateRange("2026-07-18");
    expect(parseEventDateString(formatted)).toEqual({ mode: "single", start: "2026-07-18" });
  });

  it("round-trips a same-month range", () => {
    const formatted = formatEventDateRange("2026-08-12", "2026-08-16");
    expect(parseEventDateString(formatted)).toEqual({
      mode: "range",
      start: "2026-08-12",
      end: "2026-08-16",
    });
  });

  it("round-trips a cross-month range", () => {
    const formatted = formatEventDateRange("2026-08-28", "2026-09-02");
    expect(parseEventDateString(formatted)).toEqual({
      mode: "range",
      start: "2026-08-28",
      end: "2026-09-02",
    });
  });

  it("round-trips a cross-year range", () => {
    const formatted = formatEventDateRange("2026-12-30", "2027-01-02");
    expect(parseEventDateString(formatted)).toEqual({
      mode: "range",
      start: "2026-12-30",
      end: "2027-01-02",
    });
  });

  it("falls back to custom mode for free-text dates", () => {
    expect(parseEventDateString("Every Sunday, 6 PM")).toEqual({ mode: "custom" });
  });

  it("treats an empty string as single mode with no start", () => {
    expect(parseEventDateString("")).toEqual({ mode: "single" });
  });
});
