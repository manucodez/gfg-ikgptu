import { config } from "dotenv";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { readFile } from "fs/promises";
import path from "path";

// This script runs standalone via `tsx` (outside Next.js), so it
// doesn't get Next's automatic .env.local loading — load it explicitly,
// same as prisma.config.ts.
config({ path: ".env.local" });

// One-time migration: loads the site's existing content/*.json files
// into the database. Safe to re-run — every record is upserted by
// its existing id, so running this twice just no-ops the second time
// (it never overwrites a row that's already there, so any edits made
// through the live admin dashboard after the first run are untouched).
//
// Run with: npm run db:seed
//
// Note on images: member avatars and gallery photos already stored as
// local paths (e.g. "/images/members/reshab.jpg") are left exactly as
// they are — those files are already committed under /public/images
// and Next.js serves them as static assets on any host, serverless
// included, so there's nothing to migrate there. Only *new* uploads
// made through the admin dashboard from now on go to Cloudinary (see
// lib/cloudinary.ts).

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const CONTENT_DIR = path.join(process.cwd(), "content");

async function readJson<T>(file: string): Promise<T[]> {
  try {
    const raw = await readFile(path.join(CONTENT_DIR, file), "utf-8");
    return JSON.parse(raw) as T[];
  } catch {
    // File missing (e.g. already deleted after a previous migration) —
    // just treat it as empty rather than failing the whole seed.
    return [];
  }
}

async function main() {
  console.log("Seeding the database from ./content/*.json ...\n");

  const members = await readJson<{
    id: string; name: string; role: string; team: string; year?: string; branch?: string;
    bio?: string; skills?: string[]; avatar?: string;
    socials?: { github?: string; linkedin?: string; email?: string; portfolio?: string };
  }>("members.json");
  for (const m of members) {
    await prisma.member.upsert({
      where: { id: m.id },
      create: {
        id: m.id,
        name: m.name,
        role: m.role,
        team: m.team,
        year: m.year ?? "",
        branch: m.branch ?? "",
        bio: m.bio ?? "",
        skills: m.skills ?? [],
        avatar: m.avatar ?? null,
        socialGithub: m.socials?.github ?? null,
        socialLinkedin: m.socials?.linkedin ?? null,
        socialEmail: m.socials?.email ?? null,
        socialPortfolio: m.socials?.portfolio ?? null,
      },
      update: {},
    });
  }
  console.log(`  Members ............ ${members.length}`);

  const events = await readJson<{
    id: string; title: string; date: string; location: string; description?: string;
    status: string; tags?: string[]; registrationUrl?: string; notifyOnHomepage?: boolean;
  }>("events.json");
  for (const e of events) {
    await prisma.chapterEvent.upsert({
      where: { id: e.id },
      create: {
        id: e.id,
        title: e.title,
        date: e.date,
        location: e.location,
        description: e.description ?? "",
        status: e.status,
        tags: e.tags ?? [],
        registrationUrl: e.registrationUrl ?? null,
        notifyOnHomepage: !!e.notifyOnHomepage,
      },
      update: {},
    });
  }
  console.log(`  Events .............. ${events.length}`);

  const gallery = await readJson<{
    id: string; caption: string; category: string; description?: string; image?: string;
  }>("gallery.json");
  for (const g of gallery) {
    await prisma.galleryItem.upsert({
      where: { id: g.id },
      create: {
        id: g.id,
        caption: g.caption,
        category: g.category,
        description: g.description ?? null,
        image: g.image ?? null,
      },
      update: {},
    });
  }
  console.log(`  Gallery items ....... ${gallery.length}`);

  const achievements = await readJson<{ id: string; title: string; description?: string; date: string }>(
    "achievements.json"
  );
  for (const a of achievements) {
    await prisma.achievement.upsert({
      where: { id: a.id },
      create: { id: a.id, title: a.title, description: a.description ?? "", date: a.date },
      update: {},
    });
  }
  console.log(`  Achievements ........ ${achievements.length}`);

  const stats = await readJson<{ id: string; label: string; value: number; suffix?: string }>("stats.json");
  for (const s of stats) {
    await prisma.statItem.upsert({
      where: { id: s.id },
      create: { id: s.id, label: s.label, value: s.value, suffix: s.suffix ?? null },
      update: {},
    });
  }
  console.log(`  Stats ............... ${stats.length}`);

  // Members must be seeded before this, since credentials/requests/
  // otp rows have a foreign key to members.id.
  const credentials = await readJson<{ memberId: string; passwordHash: string; passwordUpdatedAt?: string }>(
    "credentials.json"
  );
  for (const c of credentials) {
    await prisma.memberCredential.upsert({
      where: { memberId: c.memberId },
      create: {
        memberId: c.memberId,
        passwordHash: c.passwordHash,
        passwordUpdatedAt: c.passwordUpdatedAt ? new Date(c.passwordUpdatedAt) : new Date(),
      },
      update: {},
    });
  }
  console.log(`  Member credentials .. ${credentials.length}`);

  const requests = await readJson<{
    id: string; memberId: string; memberName: string; submittedAt?: string; status: string;
    resolvedAt?: string; kind?: string; changes?: unknown; previous?: unknown; emailChange?: unknown;
  }>("requests.json");
  for (const r of requests) {
    await prisma.memberChangeRequest.upsert({
      where: { id: r.id },
      create: {
        id: r.id,
        memberId: r.memberId,
        memberName: r.memberName,
        submittedAt: r.submittedAt ? new Date(r.submittedAt) : new Date(),
        status: r.status,
        resolvedAt: r.resolvedAt ? new Date(r.resolvedAt) : null,
        kind: r.kind ?? "profile",
        changes: (r.changes ?? {}) as Prisma.InputJsonValue,
        previous: (r.previous ?? {}) as Prisma.InputJsonValue,
        emailChange: r.emailChange ? (r.emailChange as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
      update: {},
    });
  }
  console.log(`  Change requests ..... ${requests.length}`);

  // OTP codes are short-lived by design — skip any already expired
  // rather than migrating dead codes.
  const otps = await readJson<{
    email: string; memberId: string; codeHash: string; expiresAt: string; attempts?: number;
  }>("otp-codes.json");
  let liveOtpCount = 0;
  for (const o of otps) {
    if (new Date(o.expiresAt).getTime() < Date.now()) continue;
    await prisma.otpRequest.upsert({
      where: { email: o.email },
      create: {
        email: o.email,
        memberId: o.memberId,
        codeHash: o.codeHash,
        expiresAt: new Date(o.expiresAt),
        attempts: o.attempts ?? 0,
      },
      update: {},
    });
    liveOtpCount++;
  }
  console.log(`  OTP requests ........ ${liveOtpCount} (of ${otps.length}; expired ones skipped)`);

  console.log("\nDone. content/*.json is left untouched as a backup — the live site now reads from the database.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
