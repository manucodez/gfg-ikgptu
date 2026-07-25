# Backend & database

This project's backend: member login, admin login, and an admin dashboard
that adds/edits/deletes members, events, gallery photos, achievements, and
homepage stats — all backed by a real Postgres database and cloud image
storage, so it works on any host, serverless included (Vercel, Netlify).

- **Auth**: signed JWT session cookies (`jose`) + bcrypt password hashing
  (`bcryptjs`). No third-party auth provider.
- **Data**: Postgres, via [Prisma](https://www.prisma.io) (`prisma/schema.prisma`
  for the tables, `prisma.config.ts` for the CLI's connection info). Every
  read/write in the app goes through `lib/content-store.ts` — no other file
  talks to Prisma directly. The app connects via
  [Neon](https://neon.tech)'s serverless driver adapter
  (`@prisma/adapter-neon`, set up in `lib/prisma.ts`) rather than a raw TCP
  connection — deliberately, since a raw connection pool doesn't survive
  serverless functions spinning up and down on every request the way Neon's
  WebSocket/HTTP-based driver does. This does mean the database is
  Neon-specific as wired up right now — switching to a different Postgres
  provider later would mean swapping `@prisma/adapter-neon` for the generic
  `@prisma/adapter-pg` in `lib/prisma.ts` (a few lines, not a rewrite).
- **Photo uploads**: [Cloudinary](https://cloudinary.com) (`lib/cloudinary.ts`).
  `saveUploadedImage`/`deleteUploadedImage` in `lib/content-store.ts` are the
  only things that call it.

This used to be a JSON-files-on-disk setup (fine for a single persistent
server, but silently loses data on serverless hosts, where the filesystem
is wiped between requests). If you're looking at an older copy of this repo
that still works that way, everything below is the upgrade that was applied.

## First-time setup

1. **Create a [Neon](https://neon.tech) Postgres database** (free tier).
   From your project's Connect panel, copy the connection string into
   `.env.local` as `DATABASE_URL`. (Using a different Postgres provider
   instead? See the adapter note above first — Neon's driver is wired in
   specifically, not just any Postgres URL.)

2. **Create a Cloudinary account** at [cloudinary.com](https://cloudinary.com)
   (free tier is plenty for a chapter site). From the dashboard, copy your
   Cloud Name, API Key, and API Secret into `.env.local` as
   `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

3. **Install dependencies and generate the Prisma Client:**

   ```bash
   npm install
   ```

   (`postinstall` runs `prisma generate` automatically — that's what turns
   `prisma/schema.prisma` into the typed `prisma.member.findMany()` etc. API
   that `lib/content-store.ts` calls. This step needs `DATABASE_URL` already
   set in `.env.local`, since `prisma.config.ts` reads it immediately.)

4. **Create the tables:**

   ```bash
   npx prisma migrate dev --name init
   ```

   Prisma 7 moved the CLI's connection info out of `schema.prisma` into
   `prisma.config.ts` — this file loads `DATABASE_URL` from `.env.local`
   itself (Next.js's automatic env loading only applies to the app itself,
   not to standalone CLI commands like this one), so nothing extra to set
   up beyond step 1.

5. **Load your existing content**, if you have real data in `content/*.json`
   you want to keep (this repo ships with the chapter's real members/events/
   etc. already in there):

   ```bash
   npm run db:seed
   ```

   This is safe to re-run — it upserts by each record's existing id, so it
   never overwrites anything you've since edited through the live admin
   dashboard. `content/*.json` itself is left untouched afterward, as a
   backup; the live site reads from the database from here on.

6. **Run it:**

   ```bash
   npm run dev
   ```

`npx prisma studio` gives you a browsable UI over the actual database
tables at any point, which is handy for spot-checking things.

## The "Join" form

The public "Join" form on the homepage (`components/contact/contact-section.tsx`)
submits to `POST /api/join` — no session required, anyone can submit it.
Submissions land in the `join_requests` table and show up under the admin
dashboard's **Join Requests** tab (`components/admin/join-requests-panel.tsx`),
where an admin can mark one contacted/archived or delete it, and the tab
shows a live badge for how many are still unreviewed ("new"). It's
deliberately disconnected from `Member` — reviewing a submission doesn't
auto-create a member account, since an admin still needs to actually decide
and follow up by email; see `lib/content-store.ts`'s `getJoinRequests` /
`addJoinRequest` / `updateJoinRequestStatus` / `deleteJoinRequest`.

## Deploying

With a real database and Cloudinary configured, Vercel or Netlify both work
directly — no filesystem dependency left anywhere in the app:

```bash
npm install -g vercel
vercel
```

Set the same environment variables from `.env.local` (`AUTH_SECRET`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH_B64`, `DATABASE_URL`, and the three
`CLOUDINARY_*` keys) in your host's project settings — `.env.local` is
gitignored and never deploys with your code. Run `npx prisma migrate deploy`
(not `migrate dev`) against your production `DATABASE_URL` before the first
deploy, and `npm run db:seed` once if you're carrying over existing content.

## Sending real OTP emails

The "forgot / set password" flow (`/reset-password`) generates a real,
short-lived, single-use 6-digit code and checks it correctly — but
`lib/mailer.ts` currently just logs it to the server console instead of
emailing it, since no email provider is configured. That's fine for local
testing but obviously not for real members. To fix it:

1. Pick a provider. **[Resend](https://resend.com)** is the easiest for a
   Next.js project (generous free tier, a few lines of SDK code, good
   deliverability without fighting spam filters). Nodemailer + your own
   SMTP (e.g. a Gmail app password) also works if you'd rather not add a
   third-party account.
2. Add the API key to `.env.local` (e.g. `RESEND_API_KEY=...`).
3. Replace the body of `sendOtpEmail` in `lib/mailer.ts`:

```ts
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOtpEmail(email: string, code: string): Promise<void> {
  await resend.emails.send({
    from: "GFG Campus Chapter <noreply@your-domain.com>",
    to: email,
    subject: "Your verification code",
    html: `<p>Your code is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
  });
}
```

Nothing else needs to change — `app/api/auth/otp/request/route.ts` already
calls `sendOtpEmail` and doesn't care how it's implemented.

## How the database layer is put together

- **`prisma/schema.prisma`** — the table definitions. Mirrors `lib/types.ts`
  closely; the one deliberate difference is `Member.socials` (a nested
  object in TypeScript) is flattened into `socialGithub`/`socialLinkedin`/
  `socialEmail`/`socialPortfolio` columns, since SQL doesn't have nested
  objects. `lib/content-store.ts` converts between the two shapes, so
  nothing outside that file ever sees the flattened version. (No `url` in
  the `datasource` block — see `prisma.config.ts` below.)
- **`prisma.config.ts`** — connection info for Prisma *CLI* commands
  (`migrate`, `studio`, `db seed`). Prisma 7 moved this out of
  `schema.prisma`; the app itself doesn't use this file at all — it
  connects via the adapter in `lib/prisma.ts` instead.
- **`lib/prisma.ts`** — a singleton `PrismaClient`, constructed with
  `@prisma/adapter-neon` (Neon's serverless driver, not a raw TCP
  connection — see the note near the top of this file for why), reused
  across hot reloads in dev so it doesn't open a new connection on every
  save.
- **`lib/cloudinary.ts`** — `uploadImage`/`deleteImage`, the only two
  functions that talk to Cloudinary directly.
- **`lib/content-store.ts`** — unchanged in shape from before: every
  function the rest of the app calls (`getMembers`, `addEvent`,
  `updateMember`, `saveUploadedImage`, ...) still exists with the same name
  and signature. `app/page.tsx`, every `app/api/**/route.ts` file, and the
  admin dashboard components needed **zero changes** for this migration.
- **`prisma/seed.ts`** — the one-time `content/*.json` → database migration
  script described in step 5 above.

One intentional behavior change from the JSON-file version: deleting a
member now also deletes their credential, any pending change requests, and
any pending OTP request, via the schema's `onDelete: Cascade`. The old
version left those rows orphaned in their respective JSON files. Everything
else is a faithful port — same validation, same edge cases, same ordering.

Existing member avatars and gallery photos that were already local files
under `/public/images/` (e.g. `/images/members/reshab.jpg`) were **not**
re-uploaded to Cloudinary during migration — those files are already
committed to the repo and Next.js serves them as static assets on any host,
serverless included, so there's nothing to move. Only new uploads made
through the admin dashboard from now on go to Cloudinary.

## Upgrading auth (optional)

The current auth is genuinely fine for a couple of admins and a handful of
member accounts. If the chapter grows and you want member self-registration,
password reset emails, or "log in with your college Google account":

- **[NextAuth.js / Auth.js](https://authjs.dev)** — the standard choice,
  supports Google/GitHub OAuth (great for a `@ikgptu.ac.in` domain
  restriction) alongside credentials login. This would replace
  `lib/session.ts` and the `/api/auth/*` routes.
- **[Clerk](https://clerk.com)** — hosted auth with prebuilt sign-up/sign-in
  UI, if you'd rather not build login forms at all.

The admin login (env-var based) is deliberately simpler than member auth and
is fine to leave as-is even after upgrading member auth — a chapter site
only needs one or two admins, and giving them an env-var-controlled login
avoids needing an "admin" role/permission system in the database at all.

## Going to production checklist

- [ ] Generate a fresh `AUTH_SECRET` — don't reuse the one in
      `.env.local.example`. (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- [ ] Set a real admin password — `npm run hash-password -- "your-new-password"`
      and put the **base64** output in `ADMIN_PASSWORD_HASH_B64`. Never put
      a raw bcrypt hash directly in an env file (see the comment in
      `.env.local.example` — Next.js's env loader corrupts the `$`
      characters in bcrypt hashes otherwise).
- [ ] Use a **separate** Postgres database and Cloudinary account (or at
      least a separate folder/prefix) for production vs. local dev, so
      testing locally can't touch real member data or eat your Cloudinary
      quota.
- [ ] Run `npx prisma migrate deploy` against production before the first
      deploy, and `npm run db:seed` once if carrying over existing content.
- [ ] Set all env vars in your host's dashboard (Vercel/Netlify/etc.) —
      `.env.local` is gitignored and never deploys with your code.
- [ ] Confirm cookies are `secure` in production — already handled
      automatically (`lib/session.ts` sets `secure: NODE_ENV === "production"`),
      but double-check your host serves the site over HTTPS.
- [ ] Consider rate-limiting `/api/auth/login` and `/api/admin/login` if
      you're worried about brute-force attempts — [Upstash's Next.js rate
      limit guide](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)
      is a common, low-effort way to add this.
