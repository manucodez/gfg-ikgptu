import { describe, it, expect } from "vitest";
import { isValidEmail, isValidUrl } from "./validation";

describe("isValidEmail", () => {
  it("accepts ordinary addresses", () => {
    expect(isValidEmail("student@gfg-ikgptu.org")).toBe(true);
    expect(isValidEmail("first.last+tag@example.co.in")).toBe(true);
  });

  it("rejects empty or whitespace-only input", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("   ")).toBe(false);
  });

  it("rejects strings missing an @ or a domain dot", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("missing-domain@")).toBe(false);
    expect(isValidEmail("@missing-local.com")).toBe(false);
    expect(isValidEmail("no-dot@localhost")).toBe(false);
  });

  it("rejects addresses containing whitespace", () => {
    expect(isValidEmail("has space@example.com")).toBe(false);
  });
});

describe("isValidUrl", () => {
  it("accepts http and https URLs", () => {
    expect(isValidUrl("https://github.com/octocat")).toBe(true);
    expect(isValidUrl("http://example.com")).toBe(true);
  });

  it("rejects empty input", () => {
    expect(isValidUrl("")).toBe(false);
    expect(isValidUrl("   ")).toBe(false);
  });

  it("rejects non-http(s) schemes", () => {
    expect(isValidUrl("ftp://example.com")).toBe(false);
    expect(isValidUrl("javascript:alert(1)")).toBe(false);
  });

  it("rejects strings that aren't URLs at all", () => {
    expect(isValidUrl("not a url")).toBe(false);
  });
});
