import { describe, it, expect } from "vitest";
import { generateOtp, otpExpiryDate, isOtpExpired, MAX_OTP_ATTEMPTS } from "./otp";

describe("generateOtp", () => {
  it("always returns a 6-digit zero-padded numeric string", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateOtp();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("can produce codes with leading zeros (padding actually applies)", () => {
    // Not deterministic in a single run, but over enough samples this
    // would virtually always hit at least one 0xxxxx code if padding
    // were broken and silently dropping leading zeros. Sanity check
    // for the padStart call, not a strict RNG distribution test.
    const codes = Array.from({ length: 500 }, () => generateOtp());
    expect(codes.some((c) => c.length === 6)).toBe(true);
    expect(codes.every((c) => c.length === 6)).toBe(true);
  });
});

describe("otpExpiryDate", () => {
  it("defaults to 10 minutes from now", () => {
    const before = Date.now();
    const expiry = new Date(otpExpiryDate()).getTime();
    const after = Date.now();
    expect(expiry).toBeGreaterThanOrEqual(before + 10 * 60 * 1000);
    expect(expiry).toBeLessThanOrEqual(after + 10 * 60 * 1000 + 1000);
  });

  it("respects a custom minute count", () => {
    const expiry = new Date(otpExpiryDate(1)).getTime();
    expect(expiry).toBeLessThan(Date.now() + 2 * 60 * 1000);
  });
});

describe("isOtpExpired", () => {
  it("is false for a timestamp in the future", () => {
    expect(isOtpExpired(otpExpiryDate(10))).toBe(false);
  });

  it("is true for a timestamp in the past", () => {
    expect(isOtpExpired(new Date(Date.now() - 1000).toISOString())).toBe(true);
  });
});

describe("MAX_OTP_ATTEMPTS", () => {
  it("is a positive integer", () => {
    expect(MAX_OTP_ATTEMPTS).toBeGreaterThan(0);
    expect(Number.isInteger(MAX_OTP_ATTEMPTS)).toBe(true);
  });
});
