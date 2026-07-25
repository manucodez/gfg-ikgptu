import bcrypt from "bcryptjs";

// Node-only (bcryptjs). Only ever imported from API routes, which
// run in the Node runtime — never from middleware.ts (Edge runtime).

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Bcrypt hashes look like `$2a$10$...` — the `$`-prefixed segments
 * are indistinguishable from shell/dotenv variable references, and
 * Next.js's env loader (dotenv-expand) silently "expands" them to
 * empty strings, corrupting the hash. Storing the hash base64-encoded
 * in .env.local sidesteps that entirely. See scripts/hash-password.js.
 */
export function decodeEnvHash(base64Hash: string): string {
  return Buffer.from(base64Hash, "base64").toString("utf-8");
}
