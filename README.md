# GeeksforGeeks Student Chapter — IKGPTU

A production-ready website for the GFG campus chapter at IKGPTU. Built with
Next.js (App Router) + TypeScript, Tailwind CSS, Framer Motion, and
Radix-based UI primitives in the shadcn/ui style. It includes:

- A public site with a member directory, events (with registration links),
  gallery, achievements, and homepage stats — all admin-editable
- Member login (email + password, admin-assigned or self-set via an
  OTP-verified email flow) and a personal dashboard to request profile
  edits and propose a new login email
- A separate admin login and dashboard to manage members (including
  avatars and password status), events, gallery photos, homepage stats,
  achievements, and review/approve member profile- and email-change requests

## Tech stack — and why

| Layer          | Choice                                   | Why |
|----------------|-------------------------------------------|-----|
| Framework      | **Next.js 14 (App Router) + TypeScript** | File-based routing, Server Components for reading live content, a huge ecosystem — the safe, standard choice for a long-lived chapter site maintained by rotating student contributors. |
| Styling        | **Tailwind CSS**                         | Keeps design tokens (the green palette, spacing, radii) in one config file, easy for new contributors to pick up. |
| UI components  | **Radix UI primitives, styled by hand in the shadcn/ui pattern** | shadcn/ui isn't an npm package — it's a CLI that copies Radix + Tailwind component source into your repo. The same components (Button, Card, Badge, Dialog, Tabs, Input) are hand-written here using the identical underlying libraries — copy-paste-and-own, no black box. |
| Animation      | **Framer Motion**                        | Used sparingly: hero entrance, member-grid transitions, the profile-panel open, count-up stats. |
| Content        | **Postgres via Prisma** (`lib/content-store.ts`), photos on **Cloudinary** | Members, events, gallery items, and member-submitted change requests live in a real database — works on serverless hosts (Vercel, Netlify), not just a persistent server. See [BACKEND.md](./BACKEND.md) for setup and how it's put together. |
| Auth           | **Custom JWT sessions (`jose`) + bcrypt (`bcryptjs`)** | No third-party auth service required. Two independent logins (member and admin) with separate signed cookies, verified in `middleware.ts`. Member passwords are stored completely separately from member profile data — see "How login works" below. |
| Dark mode      | **`next-themes`**                        | Handles the light/dark class toggle, system-theme detection, and localStorage persistence correctly. |

## Getting started

Requires Node.js 18.18+ (Node 20 LTS recommended), plus a Neon Postgres
database and a Cloudinary account (both have generous free tiers — see
[BACKEND.md](./BACKEND.md#first-time-setup) for exactly how to set these up,
it takes a few minutes).

```bash
# 1. Set up environment variables — an example is already filled in with
#    working demo admin credentials, but you still need to add your own
#    DATABASE_URL and CLOUDINARY_* keys (see BACKEND.md). This has to
#    happen before `npm install`, since installing runs `prisma generate`,
#    which needs DATABASE_URL to already be set.
cp .env.local.example .env.local   # skip this if .env.local is already present

# 2. Install dependencies (also runs `prisma generate`)
npm install

# 3. Create the database tables
npx prisma migrate dev --name init

# 4. Load the chapter's existing content (members, events, etc.) from
#    content/*.json into the database
npm run db:seed

# 5. Run the dev server
npm run dev
```

Open http://localhost:3000.

For a production build: `npm run build && npm start`.

### Admin login

| URL            | Email                  | Password        |
|----------------|--------------------------|------------------|
| `/admin/login` | `admin@gfg-ikgptu.org` | `GfgAdmin@123`   |

**Change this before putting the site online.** Generate a new hash with
`npm run hash-password -- "your-new-password"` and paste the output into
`ADMIN_PASSWORD_HASH_B64` in `.env.local` (it must stay base64-encoded —
see the comment there for why).

### Member login — how to test it

No member passwords are set yet, since real member data is already loaded
and nobody's password should be invented on their behalf. To try it:

1. Log in as admin (above) → **Members** tab → edit any member → set an
   **initial password** (at least 8 characters) → save.
2. Go to `/login` and sign in with that member's registered email + the
   password you just set.

To try the self-service **"Forgot / set password"** flow instead: go to
`/login` → "Forgot / set your password" → enter a member's registered
email. Since no real email provider is configured yet, the 6-digit code
is printed to your terminal (wherever `npm run dev`/`npm start` is
running) rather than actually emailed — look for a line starting
`📧 [DEV EMAIL...]`. See [BACKEND.md](./BACKEND.md) to wire up real email
sending.

## How login works

- **Admin** — a single set of credentials in `.env.local`
  (`ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH_B64`). No database row at all;
  a chapter only needs one or two admins.
- **Members** — log in with the email an admin put on their profile
  (a member's `socials.email`, stored on the `members` table) and a
  password. That password is **not** stored on the same record — it lives
  in a separate `member_credentials` table, keyed by member id. This split
  is deliberate: member profile data gets read directly into public page
  props (the member grid, the hero preview), so a password hash must
  never live on that same object, even server-side-only.
- Passwords are hashed one-way (bcrypt) and never stored or shown in
  readable form — not even to an admin. The Members tab shows password
  **status** instead (set or not, last changed when) and lets an admin
  set a brand-new one (with a built-in strong-password generator) for
  someone who's locked out; it can't show what the password currently is,
  because nothing in the system knows that after it's hashed.
- Members can also propose/set their own password via **email + a
  one-time code** (`/reset-password`) — no old password needed, since
  proving access to the registered email is the point.
- Every profile edit a member makes (avatar, year, branch, bio, skills,
  GitHub/LinkedIn/portfolio) goes into the `member_change_requests` table
  as a pending request rather than applying immediately — an admin
  approves or rejects it from the **Requests** tab. Name, role, and team
  stay admin-only.
- A member can also propose a **new login email**, paired with a new
  password for it, from their dashboard. This goes through the same
  Requests tab as a distinct "Email change" request — nothing about
  their login changes until an admin approves it, at which point both
  the new email and new password take effect together.

## Project structure

```
app/
  layout.tsx, page.tsx, globals.css   Root layout + home page (Server Component —
                                        reads live content on every request)
  login/page.tsx                      Member login (email + password)
  reset-password/page.tsx             OTP-verified "forgot / set password" flow
  admin/login/page.tsx                Admin login
  admin/page.tsx                      Admin dashboard (protected) — Join Requests, Requests,
                                        Members, Events, Gallery, Stats, Achievements
  dashboard/page.tsx                  Member profile + email editor (protected)
  api/join/route.ts                   Public: where the homepage "Join" form submits to
  api/auth/login,logout/route.ts      Member auth endpoints
  api/auth/otp/request,verify/…       OTP request + verification endpoints
  api/admin/login,logout/route.ts     Admin auth endpoints
  api/admin/members/…                 Member CRUD (+ photo upload/removal, + password,
                                        + credential-status)
  api/admin/events/…                  Event CRUD (+ registration link, + homepage notify flag)
  api/admin/gallery/…                 Gallery CRUD (+ photo upload)
  api/admin/stats/…                   Homepage stat-tile CRUD
  api/admin/achievements/…            Achievement CRUD
  api/admin/join-requests/…           Review "Join" form submissions (status, delete)
  api/admin/requests/…                Approve/reject member change requests
                                        (profile edits and email changes)
  api/member/request-change/route.ts  Where a member submits a profile-change request
  api/member/request-email-change/…   Where a member proposes a new login email + password

middleware.ts             Protects /admin, /api/admin/*, /api/member/*, /dashboard

components/
  navbar.tsx, hero.tsx, about.tsx, stats.tsx, announcement.tsx, footer.tsx
  members/            The member grid: section, tile, profile panel (validates
                       links before showing an icon), filters
  member-dashboard/   Profile-edit form (avatar, year, branch, bio, skills, links)
                       + email-change-form.tsx (view/propose login email change)
  gallery/            Carousel + grid preview (renders real photos when present)
  events/             Status-tabbed event list, click-through detail dialog with
                       Register-now link + admin inline link editor
  achievements/       Timeline (reads from the database via getAchievements())
  contact/            "Join" form — submits to /api/join, no session required
  auth/logout-button.tsx
  admin/              Dashboard tabs: join-requests-panel, requests-panel,
                      members-panel + member-form, events-panel + event-form,
                      gallery-panel, stats-panel, achievements-panel
  ui/                 Hand-built primitives: button, card, badge, dialog, tabs, input, textarea

content/              One-time seed source only (see prisma/seed.ts) — the
                       live site reads from the database now, not these files.
                       (join_requests has no JSON file here — that table was
                       added after this migration, so it only ever lived in
                       the database.)
  members.json          Public profile data — never contains password hashes
  credentials.json      memberId → passwordHash + passwordUpdatedAt, kept
                        separate on purpose (see MemberCredential in lib/types.ts)
  otp-codes.json        Short-lived, single-use password-reset codes
  requests.json          Pending/resolved member profile-change and email-change requests
  events.json, gallery.json, stats.json, achievements.json

prisma.config.ts       Connection info for the Prisma CLI (migrate, studio, db seed) —
                       Prisma 7 moved this out of schema.prisma; the app itself doesn't
                       use this file (see lib/prisma.ts)
prisma/
  schema.prisma         Database schema — mirrors lib/types.ts, plus JoinRequest for
                        the "Join" form (see BACKEND.md)
  seed.ts               One-time migration: content/*.json → database (npm run db:seed)

lib/
  types.ts             Shared TypeScript types
  content-store.ts     Every read/write to the database + Cloudinary goes through
                       here — the only file that imports lib/prisma.ts directly
  prisma.ts             PrismaClient singleton, connected via Neon's serverless
                        driver adapter (@prisma/adapter-neon) rather than a raw
                        TCP connection — see BACKEND.md for why
  cloudinary.ts          Image upload/delete helpers, used only by content-store.ts
  session.ts           JWT session creation/verification (Edge-safe, used by middleware)
  current-member.ts    Server-side "who's the signed-in member" helper
  current-admin.ts     Server-side "is the visitor a signed-in admin" helper (for
                       admin-only UI on public pages, like the event link editor)
  password.ts           bcrypt hashing/verification (Node-only) — used for both
                        admin/member passwords and OTP-code hashing
  otp.ts                 6-digit code generation + expiry helpers
  mailer.ts              Single swap point for real email sending (see BACKEND.md)
  validation.ts           isValidUrl / isValidEmail — also gates which social
                          icons show up on a public profile
  utils.ts              cn() class merger, initials/avatar-color helpers

scripts/hash-password.js   CLI: generate a bcrypt hash for the admin password
```

## Editing content

**Members, events, gallery photos, homepage stats, and achievements** — use
the admin dashboard at `/admin/login`. This is the intended way to edit
them; changes appear on the live site immediately, no rebuild needed.
Member-submitted profile edits and email changes appear in the
**Requests** tab for approval first.

You can also browse and edit the database directly with `npx prisma studio`
if you prefer a spreadsheet-like UI (e.g. for a bulk import) — it opens at
http://localhost:5555.

**Colors / fonts** — edit `tailwind.config.ts` (the `brand`, `ink`, `paper`,
`surface` colors) and the font links in `app/layout.tsx`.

## Known placeholders to swap before launch

- **Email sending** — OTP codes are printed to the server console, not
  emailed, since no provider is configured. See `lib/mailer.ts` and
  [BACKEND.md](./BACKEND.md).
- **Contact form** (`components/contact/contact-section.tsx`) only manages
  local UI state — it shows a success message but doesn't send anywhere.
- **Social links** (navbar, footer, contact section) are placeholder URLs.
- **Admin credentials** — see above.

## Backend

The admin dashboard and member login are backed by a real Postgres database
and Cloudinary image storage (see [BACKEND.md](./BACKEND.md) for setup) —
this works on serverless hosts like Vercel out of the box, not just a
persistent server. The one remaining placeholder: OTP emails aren't
actually emailed anywhere yet (they print to the server console). **[Read
BACKEND.md](./BACKEND.md)** for wiring up real email sending, and for
stronger auth options if the chapter outgrows the current setup.

## Accessibility & responsiveness notes

- All interactive elements are real `<button>`/`<a>` tags with visible focus
  rings (see `:focus-visible` in `globals.css`).
- `prefers-reduced-motion` is respected — animations collapse to near-zero
  duration for users who've requested it.
- The member grid, gallery, and event cards are tested down to a 360px-wide
  mobile viewport; the profile panel becomes a bottom sheet on small screens
  and a centered modal from `sm:` breakpoints up.
