import { describe, it, expect } from "vitest";
import {
  memberLoginSchema,
  adminLoginSchema,
  otpRequestSchema,
  otpVerifySchema,
  requestEmailChangeSchema,
  joinRequestSchema,
  trackPageViewSchema,
  firstZodError,
} from "./schemas";

describe("memberLoginSchema", () => {
  it("accepts a normal email + password", () => {
    const result = memberLoginSchema.safeParse({ email: "a@b.com", password: "hunter2" });
    expect(result.success).toBe(true);
  });

  it("rejects a missing password", () => {
    const result = memberLoginSchema.safeParse({ email: "a@b.com", password: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing email", () => {
    const result = memberLoginSchema.safeParse({ password: "hunter2" });
    expect(result.success).toBe(false);
  });

  it("does not require strict email format (matches the pre-existing route behavior)", () => {
    // The original route only checked "is this truthy", not "is this
    // a well-formed email" — see the note at the top of schemas.ts.
    const result = memberLoginSchema.safeParse({ email: "not-an-email", password: "hunter2" });
    expect(result.success).toBe(true);
  });
});

describe("adminLoginSchema", () => {
  it("accepts email + password", () => {
    expect(adminLoginSchema.safeParse({ email: "admin@x.com", password: "pw" }).success).toBe(true);
  });

  it("rejects an empty body", () => {
    expect(adminLoginSchema.safeParse({}).success).toBe(false);
  });
});

describe("otpRequestSchema", () => {
  it("accepts any non-empty email string", () => {
    expect(otpRequestSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
  });

  it("rejects an empty email", () => {
    expect(otpRequestSchema.safeParse({ email: "" }).success).toBe(false);
  });

  it("rejects a missing email field entirely", () => {
    expect(otpRequestSchema.safeParse({}).success).toBe(false);
  });
});

describe("otpVerifySchema", () => {
  const valid = { email: "a@b.com", code: "123456", newPassword: "longenough" };

  it("accepts a complete valid payload", () => {
    expect(otpVerifySchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a password under 8 characters", () => {
    expect(otpVerifySchema.safeParse({ ...valid, newPassword: "short" }).success).toBe(false);
  });

  it("rejects a missing code", () => {
    const { code: _code, ...rest } = valid;
    expect(otpVerifySchema.safeParse(rest).success).toBe(false);
  });
});

describe("requestEmailChangeSchema", () => {
  it("accepts a valid email + long-enough password", () => {
    const result = requestEmailChangeSchema.safeParse({
      newEmail: "new@example.com",
      newPassword: "longenough",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a malformed email (this route DID validate format before)", () => {
    const result = requestEmailChangeSchema.safeParse({
      newEmail: "not-an-email",
      newPassword: "longenough",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a short password", () => {
    const result = requestEmailChangeSchema.safeParse({
      newEmail: "new@example.com",
      newPassword: "short",
    });
    expect(result.success).toBe(false);
  });
});

describe("joinRequestSchema", () => {
  const valid = { name: "Priya", email: "priya@example.com", branch: "CSE", year: "2nd" };

  it("accepts a valid submission without a message", () => {
    expect(joinRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a valid submission with a message", () => {
    expect(joinRequestSchema.safeParse({ ...valid, message: "Excited to join!" }).success).toBe(true);
  });

  it("rejects a malformed email", () => {
    expect(joinRequestSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects a missing name/branch/year", () => {
    expect(joinRequestSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
    expect(joinRequestSchema.safeParse({ ...valid, branch: "" }).success).toBe(false);
    expect(joinRequestSchema.safeParse({ ...valid, year: "" }).success).toBe(false);
  });

  it("rejects a message over 2000 characters", () => {
    expect(joinRequestSchema.safeParse({ ...valid, message: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("trackPageViewSchema", () => {
  it("accepts a path starting with /", () => {
    expect(trackPageViewSchema.safeParse({ path: "/" }).success).toBe(true);
    expect(trackPageViewSchema.safeParse({ path: "/dashboard" }).success).toBe(true);
  });

  it("rejects a path not starting with /", () => {
    expect(trackPageViewSchema.safeParse({ path: "dashboard" }).success).toBe(false);
  });

  it("rejects an overly long path", () => {
    expect(trackPageViewSchema.safeParse({ path: "/" + "a".repeat(300) }).success).toBe(false);
  });
});

describe("firstZodError", () => {
  it("returns the first issue's message on failure", () => {
    const result = joinRequestSchema.safeParse({ name: "", email: "bad", branch: "", year: "" });
    expect(firstZodError(result)).toBe("Name is required.");
  });

  it("returns an empty string on success", () => {
    const result = otpRequestSchema.safeParse({ email: "a@b.com" });
    expect(firstZodError(result)).toBe("");
  });
});
