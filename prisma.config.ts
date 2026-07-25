import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Prisma CLI commands (migrate, studio, db seed) run outside of
// Next.js, so they don't get Next's automatic .env.local loading —
// this loads it explicitly. The app itself doesn't need this: Next.js
// already loads .env.local on its own for lib/prisma.ts.
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Used by CLI commands only (migrate, db push, studio). The app
    // itself connects via the adapter in lib/prisma.ts, not this file.
    url: env("DATABASE_URL"),
  },
});
