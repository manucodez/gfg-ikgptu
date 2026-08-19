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
`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH_B64`, `DATABASE_URL`, the three
`CLOUDINARY_*` keys, and `GMAIL_USER`/`GMAIL_APP_PASSWORD`) in your
host's project settings — `.env.local` is gitignored and never deploys
with your code. Run `npx prisma migrate deploy` (not `migrate dev`)
against your production `DATABASE_URL` before the first deploy, and
`npm run db:seed` once if you're carrying over existing content.

## Sending OTP emails (Gmail SMTP)

The "forgot / set password" flow (`/reset-password`) generates a real,
short-lived, single-use 6-digit code and checks it correctly, and
`lib/mailer.ts` sends it for real via Gmail's SMTP server (using
[nodemailer](https://nodemailer.com), the standard Node email library):

1. Turn on 2-Step Verification for the Gmail account you want to send
   from, at myaccount.google.com/security. This is required — Gmail's
   SMTP server rejects your regular account password even if you skip
   this step, it just fails with an auth error.
2. Generate an App Password at myaccount.google.com/apppasswords
   (choose "Mail" as the app it's for). Google gives you a 16-character
   password — put it in `.env.local` as `GMAIL_APP_PASSWORD`.
3. Set `GMAIL_USER` to that Gmail address itself.

Without both set, `sendOtpEmail` falls back to printing the code to
the server console instead of sending anything — so local dev keeps
working without every contributor needing their own Gmail app
password. If Gmail *is* configured but a send genuinely fails (wrong
app password, hitting Gmail's daily sending limit, etc.), the person
requesting the code sees a real error instead of the app claiming
success and the email never arriving — see `MailerError` in
`lib/mailer.ts` and how `app/api/auth/otp/request/route.ts` catches it.

Two things worth knowing about this specific choice, honestly:
- **Sending limit**: a regular Gmail account tops out at 500 emails/day
  (2,000/day on Google Workspace). Fine for a chapter site's OTP
  volume; worth revisiting if the chapter ever gets large enough that
  it's a real constraint.
- **Deliverability**: mail sent from a personal Gmail address through
  SMTP is more likely to land in spam than mail from a dedicated
  transactional provider (Resend, Postmark, SES) sending through a
  domain with proper SPF/DKIM records. If that becomes a real problem,
  swapping providers only means rewriting the inside of
  `sendOtpEmail` in `lib/mailer.ts` — the function's signature
  (`sendOtpEmail(email, code)`) and everywhere it's called stay exactly
  the same.

## The resume upload on the "Join" form

The join form's optional resume/CV field uploads to Cloudinary as a
**raw** file (`lib/cloudinary.ts`'s `uploadRawFile` — Cloudinary treats
PDFs/Word docs as a different resource type than photos, so this is a
separate function from the image uploader). `POST /api/join` validates
the file server-side (PDF/DOC/DOCX only, 5MB max) regardless of what
the browser's file picker already filtered, and stores the resulting
URL on the `join_requests` row as `resumeUrl`. An admin sees a "View
resume" link on any submission that included one, from the **Join
Requests** tab.

## Login activity (admin "Activity" tab)

Every successful *member* login (not admin logins — with only one or
two admins, an admin watching their own login history isn't useful the
way seeing member activity is; and not failed attempts, just
successful ones) gets recorded via `addLoginEvent` in
`lib/content-store.ts`, called from `app/api/auth/login/route.ts`
right after the password check passes. The admin dashboard's
**Activity** tab (`components/admin/login-activity-panel.tsx`) polls
`GET /api/admin/login-events` every 10 seconds and shows the most
recent 100, newest first, with a relative timestamp ("2m ago") and a
best-effort device summary parsed from the User-Agent header (e.g.
"Chrome on iPhone").

This is polling, not a true real-time push (WebSockets/Server-Sent
Events) — a deliberate tradeoff given the app runs on serverless hosts
(Vercel/Netlify), where a persistent connection per admin dashboard tab
isn't something the platform is built for without extra infrastructure
(a separate WebSocket service, a provider like Pusher/Ably, etc.).
Every 10 seconds is close enough to "real time" for "did someone just
log in" without that added complexity — newly-arrived entries briefly
highlight so a fresh login is easy to notice even without watching the
tab closely.

Deliberately **not** tracked: IP address (privacy — a member's device
type is useful context, their precise location isn't information this
app needs to hold onto) and failed login attempts (that's a security
monitoring feature, a different concern from "who's using their
account," and would need its own thinking about rate-limiting/lockout
before being worth adding).

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

Admin login is database-backed (the `admins` table — name, email, bcrypt
hash), managed from the dashboard's **Admins** tab, so any number of people
can each have their own account. The original env-var login
(`ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH_B64`) still works alongside it as a
bootstrap/break-glass fallback and doesn't need to be removed. There's no
tiered permission system — every admin account can do everything any other
admin can, including managing other admins — which is fine for a chapter
site's low-friction, mutual-trust model, but worth knowing if that's ever
not the fit you want.

**If you're adding this to a site that's already deployed**, the `admins`
table needs to exist in your production database before the new code can
use it. Since this repo doesn't track migration history (the schema was
applied with `db push`, not `migrate`), run this once, pointed at your
production `DATABASE_URL`, then redeploy:

```bash
npx prisma db push
```

This only adds the new `admins` table — every other table is already an
exact match, so nothing else changes. Then log in with your existing
`ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH_B64` credentials and use the new
**Admins** tab to create a real account for each person who needs one.

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
