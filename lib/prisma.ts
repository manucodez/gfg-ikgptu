import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Prisma 7 requires a driver adapter — there's no built-in connection
// engine anymore. PrismaNeon specifically (rather than the generic
// Postgres adapter) is the right choice here because this app deploys
// to serverless hosts (Vercel/Netlify): it talks to Neon over
// WebSocket/HTTP instead of holding a raw TCP connection open, which
// is what actually lets a database survive a function that spins up
// and tears down on every request instead of running as one long-lived
// server.
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });

// Next.js hot-reloads modules in dev, which would otherwise create a
// fresh PrismaClient (and adapter) on every file save. Stashing the
// instance on `globalThis` survives the reload so dev keeps reusing
// the same client. In production each serverless invocation gets its
// own module scope anyway, so this is a no-op there — just a plain
// singleton per instance.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
