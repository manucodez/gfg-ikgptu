import { defineConfig } from "vitest/config";
import path from "path";

// Only lib/**/*.test.ts is exercised — these are pure-function unit
// tests for logic that doesn't need a database, network, or browser
// (validation, OTP expiry math, rate limiting, ICS generation, event
// date parsing, request schemas). Anything that touches Prisma,
// Cloudinary, or Next's request/response types is integration-level
// and isn't something a from-scratch test double can verify
// meaningfully — see TESTING.md for what that would take and why
// it's intentionally out of scope here.
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
