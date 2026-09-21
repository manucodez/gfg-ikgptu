# What changed

Everything below was implemented, type-checked (`tsc --noEmit`), linted (`next lint`),
and built (`next build`) successfully in a sandboxed environment without access to a
live database, Cloudinary, Gmail, or Redis — see **Testing & verification** at the
bottom for exactly what that does and doesn't guarantee, and what to check once this
is running against your real services.

## 🔒 Security

- **Fixed user-enumeration in member login and password-reset.** `/api/auth/login`
  now returns one generic message ("Incorrect email or password...") whether the
  account doesn't exist, has no password set, or the password is wrong — matching
  the admin login's existing behavior. `/api/auth/otp/request` now always responds
  `{ ok: true }` and silently does nothing for an unregistered email, rather than a
  distinct 404. The reset-password frontend needed no changes — it already just
  checks `res.ok`.
- **Rate limiting**, via a new dual-mode limiter (`lib/rate-limit.ts`): uses Upstash
  Redis's REST API when `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are set
  (shared across serverless instances), otherwise an in-memory sliding window
  (per-instance, self-pruning, capped so it can't leak memory). Applied to:
  - Member login (20/15min per IP, 8/15min per email)
  - Admin login (10/15min per IP, 5/15min per email — stricter, higher-value target)
  - OTP request (10/hour per IP, 3/10min per email)
  - The public Join form (5/hour per IP)
  - The page-view beacon and Codeforces lookup (loose, abuse-prevention only)
- **Admin roles — "owner" vs "admin".** New `role` column on `Admin`
  (`prisma/schema.prisma`). Owners can create/remove admins and change roles;
  regular admins have full content-management access but not that. The env-var
  bootstrap login is always treated as owner. The very first database-backed admin
  is always forced to owner regardless of what's requested, so a fresh site can
  never end up with zero owners. Both the last-owner-can't-be-demoted and
  last-owner-can't-be-removed cases are guarded server-side. Fully wired into the
  Admins tab UI (role badges, promote/demote, add/remove gated to owners).

## 📈 Scalability

- **Admin Members panel search box** — client-side filter by name, role, team,
  branch, year, or skill. This was the most urgent fix from the original review:
  the panel had no way to find someone in a long list at all.
- **Real server-side pagination + bulk actions for Join Requests** — "Load more"
  pagination, multi-select checkboxes, and bulk mark-contacted / archive / delete
  (new `PATCH`/`DELETE /api/admin/join-requests/bulk`). The "new submissions" badge
  count stays accurate independent of how many pages are loaded.
- **Pagination support for Change Requests** (`getChangeRequestsPage` in
  `lib/content-store.ts`) for future use in the resolved-requests history view.
- **Homepage data caching** — `getPublicHomepageContent()` wraps the combined
  members/events/gallery/stats/achievements read in Next's Data Cache
  (`unstable_cache`, 60s) with tag-based invalidation
  (`revalidateHomepageContent()`, called from every admin route that changes that
  content, so edits show up immediately rather than after the cache window).
  **Important nuance:** the homepage itself is *not* full-page ISR-cached, and
  deliberately so — it reads the visitor's own login cookie to personalize the
  navbar, so caching the whole rendered page would risk one visitor's session
  leaking into another visitor's cached HTML. Only the shared data underneath is
  cached; the page still renders fresh per request. (This is a correction from the
  simpler page-level ISR I'd originally sketched out — caught while implementing it.)
- **Scheduled cleanup** (`/api/cron/cleanup`, wired to run daily via `vercel.json`'s
  `crons` config) — prunes login-activity rows older than 90 days and expired OTP
  requests. Protected by `CRON_SECRET`; refuses to run if that's unset, rather than
  running unauthenticated.

## ✨ Features

- **Sitemap, robots.txt, Open Graph/Twitter metadata** (`app/sitemap.ts`,
  `app/robots.ts`, `app/layout.tsx`). Private areas (`/admin`, `/dashboard`,
  `/api`, `/reset-password`) are excluded from indexing.
- **Admin email notifications** on new Join Requests and new profile/email change
  requests (`sendAdminNotificationEmail` in `lib/mailer.ts`, BCC'd to every admin's
  email plus the env-var fallback address). Fire-and-forget — a notification
  failing, or Gmail not being configured, never blocks the actual submission.
- **"Add to calendar" (.ics) on events** — `lib/ics.ts` generates a correct,
  RFC 5545-compliant all-day calendar file (proper text escaping, line-folding,
  exclusive end dates); `GET /api/events/[id]/ics` serves it; a button appears on
  the event detail dialog whenever the event's date is in a format that can
  actually be converted (skipped for free-text dates like "Every Sunday, 6 PM"
  rather than guessing).
- **Codeforces rating badges** — the one contest-platform integration built, since
  Codeforces has a stable public API with no auth required (LeetCode's is
  unofficial and frequently breaking; GFG has no public API at all). A member can
  optionally set a `codeforcesHandle`; their profile then shows a live rating
  badge, colored using Codeforces' own rating bands, fetched lazily only when a
  profile is opened (never on the homepage's member grid) and cached server-side
  for an hour.
- **Admin "Overview" tab** — new default landing tab showing member/event/request
  counts, a join-request funnel (new/contacted/archived), and a 30-day page-view
  chart plus most-viewed paths, all rendered with plain CSS (no new charting
  dependency, matching this project's existing lean footprint). Backed by a new,
  deliberately anonymous `PageView` model — no cookie, IP, or visitor id is ever
  stored, only "path X was viewed N times on date Y" — tracked via a
  `sendBeacon`-based client component and a rate-limited `/api/track` endpoint.

## 🛠️ Engineering hygiene

- **`app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx`** — branded pages
  instead of Next's generic defaults.
- **Zod validation** on the public/most abuse-exposed routes: member login, admin
  login, OTP request, OTP verify, the Join form, and the email-change request
  (`lib/schemas.ts`). Every schema matches each route's *existing* validation
  behavior as closely as possible (e.g. login's email field stays a plain
  non-empty-string check, matching what it always was) — this is a refactor for
  consistent, centralized validation, not a behavior change, except where the
  original route already validated email format (request-email-change), where
  that's preserved. **Deliberately not applied** to the admin CRUD routes (already
  behind an authenticated-admin-only middleware check, with their own working
  per-field validation) or to `member/request-change` (its diff-against-current-
  value logic is closely tied to `lib/content-store.ts`'s `MemberEditableFields`
  handling in a way that duplicating into a separate schema risked drifting out of
  sync with).
- **GitHub Actions CI** (`.github/workflows/ci.yml`) — lint, type-check, unit
  tests, and a full production build on every push/PR. Uses placeholder env values
  (documented inline as such) so it never needs real credentials to verify the
  code compiles and builds.
- **Vitest unit tests** (`lib/*.test.ts`, 65 tests, all passing) for every pure,
  database-independent piece of logic: email/URL validation, OTP generation and
  expiry math, the rate limiter's in-memory mode, event date parsing round-trips,
  .ics generation (including RFC 5545 escaping and exclusive end-date math), and
  every new Zod schema. Run with `npm run test`. **Deliberately not attempted**:
  integration tests against Prisma/Postgres, Cloudinary, or real HTTP requests —
  those would need a real database and external services to be meaningful rather
  than a from-scratch mock of them, which is a bigger, separate undertaking.

# Setup steps required

1. **Apply the schema changes** — either:
   ```bash
   npx prisma migrate dev --name add_role_codeforces_pageviews
   ```
   or, if you're following this project's existing `db push` workflow (see
   BACKEND.md's "Upgrading auth" section):
   ```bash
   npx prisma db push
   ```
   This adds `Admin.role`, `Member.codeforcesHandle`, and the new `PageView` table.
2. **Run `npm install`** — adds `zod` (runtime dependency) and `vitest` (dev
   dependency only).
3. **Optional env vars** — see the new table in `BACKEND.md`'s first-time-setup
   section: `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`, `CRON_SECRET`,
   `NEXT_PUBLIC_SITE_URL`. Nothing breaks without them; each just enables one
   specific thing (see the table).
4. **If deploying to Vercel**, the `crons` entry in `vercel.json` will register
   automatically; set `CRON_SECRET` in the project's environment variables for it
   to actually run.

# Deliberately out of scope

Called out here rather than silently dropped, in the interest of an accurate
picture of what this delivers:

- **Full DB-level pagination for the public Members/Events/Gallery pages** — kept
  as a full list; the new data-cache layer (60s, tag-invalidated) addresses the
  database-load concern a different way, and the admin-side member list still
  needs the full array for drag-and-drop reordering to make sense.
- **Bulk actions for the Change Requests panel** — only Join Requests got bulk
  actions; Change Requests review (approve/reject) is more consequential per-item
  (it writes back to a member's actual profile) and was kept single-item to limit
  the blast radius of any bug in a first pass.
- **LeetCode/other contest-platform integrations** — only Codeforces, for the
  reason above (stable public API vs. unofficial/undocumented ones).
- **Migrating off Gmail SMTP to a transactional provider** (Resend/SES) — this
  needs your own account/domain setup; the new admin-notification emails go
  through the same `lib/mailer.ts` path as the existing OTP emails, so a future
  swap covers both at once.
- **Rewriting the pre-existing `npm audit` findings** — running `npm audit` on this
  project surfaces a handful of high/critical advisories in `next`, `prisma`'s CLI
  tooling, and `@typescript-eslint`'s dependencies. These were already present in
  the project before this round of changes (confirmed via `git diff package.json`
  — the only new dependency added here is `zod`, which has zero dependencies of
  its own) and would need a Next.js/Prisma major-version upgrade to resolve, which
  is a separate, larger undertaking with its own compatibility risks. Worth
  planning as a follow-up.

# Testing & verification

This was implemented and verified inside a sandboxed container with **no network
access to your real Postgres database, Cloudinary, Gmail, Upstash Redis, or
Codeforces' API** — only to npm's package registry. To get real verification
anyway, a local stub of the generated Prisma client was built (matching the real
schema's shape) purely so `tsc`, `next lint`, and `next build` could run for real
in that environment; that stub is not part of this delivery — only your own
`npx prisma generate` output is.

**What was genuinely, not just plausibly, verified:**
- A full `next build` succeeds (every route compiles, bundles, and the two route
  groups that could plausibly collide — `join-requests/bulk` vs.
  `join-requests/[id]` — build correctly).
- `tsc --noEmit` passes across the whole project, including every new/modified
  file.
- All 65 Vitest unit tests actually run and pass — real assertions against real
  function output, not just "it compiles."

**What was not, and needs your own check once this is running for real:**
- Anything that touches Prisma/Postgres at runtime (every new query in
  `content-store.ts` was written to closely mirror the exact patterns already used
  elsewhere in that same file, but wasn't executed against a live database here).
- Cloudinary uploads, Gmail sending, Upstash-backed rate limiting, and the
  Codeforces API call — each has a code path that only exists once you supply real
  credentials.
- Visual/UX review of the new UI (the Members search box, Join Requests bulk-select
  bar, Overview tab's charts, Admins tab's role controls, Codeforces badge) — this
  was written to match the existing design system's classes and patterns
  throughout, but hasn't been looked at in a real browser.

A reasonable first pass once you have this running locally: sign in as the
env-var admin, add a second admin, promote them to owner, try demoting/removing
the last owner (should be refused), submit the Join form a few times and try the
new bulk actions, open an event with a normal date and check the calendar button
downloads a valid .ics, and set a Codeforces handle on your own profile.
