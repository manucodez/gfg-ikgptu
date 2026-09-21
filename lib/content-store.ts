import { Prisma } from "@prisma/client";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { uploadImage, deleteImage, uploadRawFile } from "@/lib/cloudinary";
import type {
  Member,
  ChapterEvent,
  GalleryItem,
  MemberChangeRequest,
  MemberEditableFields,
  MemberCredential,
  OtpRequest,
  Achievement,
  StatItem,
  JoinRequest,
  JoinRequestStatus,
  LoginEvent,
  Admin,
  DailyPageViews,
  PathPageViews,
  OverviewStats,
} from "@/lib/types";
import { parseDateValue } from "@/lib/utils";

// A Postgres-backed "database" (via Prisma) for content the admin
// dashboard edits at runtime: members, events, gallery items, and
// pending member profile-change requests. This replaced an earlier
// JSON-file version — see BACKEND.md for that history. Every function
// here keeps the exact same name and signature it had before, so this
// file is still the *only* place in the app that knows how content is
// actually stored; nothing else changed.
//
// One deliberate behavior change from the JSON-file version: deleting
// a member now cascades to their credential, pending change requests,
// and OTP requests at the database level (see the schema's `onDelete:
// Cascade`), instead of leaving those rows orphaned. Everything else
// below is a faithful port.

// --- Members -----------------------------------------------------

type MemberRow = {
  id: string;
  name: string;
  role: string;
  team: string;
  year: string;
  branch: string;
  bio: string;
  skills: string[];
  avatar: string | null;
  socialGithub: string | null;
  socialLinkedin: string | null;
  socialEmail: string | null;
  socialPortfolio: string | null;
  codeforcesHandle: string | null;
};

function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    team: row.team,
    year: row.year,
    branch: row.branch,
    bio: row.bio,
    skills: row.skills,
    avatar: row.avatar ?? undefined,
    socials: {
      github: row.socialGithub ?? undefined,
      linkedin: row.socialLinkedin ?? undefined,
      email: row.socialEmail ?? undefined,
      portfolio: row.socialPortfolio ?? undefined,
    },
    codeforcesHandle: row.codeforcesHandle ?? undefined,
  };
}

function memberToRow(member: Member) {
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    team: member.team,
    year: member.year,
    branch: member.branch,
    bio: member.bio,
    skills: member.skills,
    avatar: member.avatar ?? null,
    socialGithub: member.socials.github ?? null,
    socialLinkedin: member.socials.linkedin ?? null,
    socialEmail: member.socials.email ?? null,
    socialPortfolio: member.socials.portfolio ?? null,
    codeforcesHandle: member.codeforcesHandle ?? null,
  };
}

export async function getMembers(): Promise<Member[]> {
  const rows = await prisma.member.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toMember);
}

export interface MemberSearchOptions {
  /** Case-insensitive substring match against name, role, team,
   *  branch, and skills. */
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Search + paginate members server-side — used by the admin Members
 * tab's search box (see components/admin/members-panel.tsx) so an
 * admin can actually find someone once the roster grows past a
 * screenful. Kept as a *separate* function from getMembers() rather
 * than adding optional params there, so every existing caller of
 * getMembers() (the public member grid, the homepage) is completely
 * unaffected — sort order for the drag-and-drop-reorderable admin
 * list still always follows sortOrder/createdAt, same as before.
 */
export async function searchMembers(options: MemberSearchOptions): Promise<PagedResult<Member>> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, options.pageSize ?? 50));
  const search = options.search?.trim();

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { role: { contains: search, mode: "insensitive" as const } },
          { team: { contains: search, mode: "insensitive" as const } },
          { branch: { contains: search, mode: "insensitive" as const } },
          { year: { contains: search, mode: "insensitive" as const } },
          { skills: { has: search } },
        ],
      }
    : undefined;

  const [rows, total] = await Promise.all([
    prisma.member.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.member.count({ where }),
  ]);

  return { items: rows.map(toMember), total, page, pageSize };
}

/** Replaces the given members wholesale (upserting each by id) — kept
 *  for API-compatibility with the JSON-file version; not currently
 *  called from outside this file. */
export async function saveMembers(members: Member[]): Promise<void> {
  await prisma.$transaction(
    members.map((m) => {
      const row = memberToRow(m);
      return prisma.member.upsert({ where: { id: m.id }, create: row, update: row });
    })
  );
}

export async function addMember(member: Member): Promise<void> {
  // Append after whatever's currently last, rather than leaving the
  // default sortOrder of 0 — once some members have been manually
  // reordered (distinct sortOrder values), a bare 0 would jump a
  // brand-new member to the front instead of the end.
  const { _max } = await prisma.member.aggregate({ _max: { sortOrder: true } });
  const nextSortOrder = (_max.sortOrder ?? -1) + 1;
  await prisma.member.create({ data: { ...memberToRow(member), sortOrder: nextSortOrder } });
}

/** Persists a new admin-chosen display order — the whole ordered list
 *  of member ids is sent every time (simpler and more robust than
 *  computing gaps/insert positions), setting sortOrder to each
 *  member's index in that list. Powers the drag-and-drop reordering
 *  in the admin Members tab.
 *
 *  This is one raw UPDATE...FROM(VALUES) statement, not N separate
 *  prisma.member.update() calls wrapped in $transaction — that was
 *  the original approach, and it was the actual bug behind "Couldn't
 *  save the new order": each update is its own round trip to Neon,
 *  all sequential inside one interactive transaction, and Prisma's
 *  default interactive-transaction timeout is 5 seconds. Past a
 *  couple dozen members (or just a slow connection), the whole
 *  transaction blew past that timeout and got rolled back — every
 *  time, not intermittently, since total duration scales with member
 *  count regardless of how many actually moved. A single statement
 *  is one round trip no matter how many members there are, and is
 *  atomic on its own, so there's no $transaction (and no timeout) to
 *  reach for in the first place. */
export async function reorderMembers(orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) return;
  const rows = Prisma.join(
    orderedIds.map((id, index) => Prisma.sql`(${id}::text, ${index}::int)`),
    ", "
  );
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "members" AS m
    SET "sortOrder" = v.sort_order
    FROM (VALUES ${rows}) AS v(id, sort_order)
    WHERE m.id = v.id
  `);
}

export async function updateMember(id: string, patch: Partial<Member>): Promise<Member | null> {
  const data: Prisma.MemberUpdateInput = {};
  if ("name" in patch) data.name = patch.name;
  if ("role" in patch) data.role = patch.role;
  if ("team" in patch) data.team = patch.team;
  if ("year" in patch) data.year = patch.year;
  if ("branch" in patch) data.branch = patch.branch;
  if ("bio" in patch) data.bio = patch.bio;
  if ("skills" in patch) data.skills = patch.skills;
  if ("avatar" in patch) data.avatar = patch.avatar ?? null;
  if ("codeforcesHandle" in patch) data.codeforcesHandle = patch.codeforcesHandle ?? null;
  if ("socials" in patch) {
    data.socialGithub = patch.socials?.github ?? null;
    data.socialLinkedin = patch.socials?.linkedin ?? null;
    data.socialEmail = patch.socials?.email ?? null;
    data.socialPortfolio = patch.socials?.portfolio ?? null;
  }
  try {
    const row = await prisma.member.update({ where: { id }, data });
    return toMember(row);
  } catch {
    return null;
  }
}

export async function deleteMember(id: string): Promise<void> {
  // Credential + pending change requests + OTP requests cascade-delete
  // automatically via the schema's onDelete: Cascade.
  await prisma.member.delete({ where: { id } }).catch(() => {});
}

export async function getMemberById(id: string): Promise<Member | null> {
  const row = await prisma.member.findUnique({ where: { id } });
  return row ? toMember(row) : null;
}

/** Removes a member's avatar: deletes the file on Cloudinary (if it's
 *  one of our own uploads) and clears the field, falling back to
 *  their initials tile everywhere the site renders them. */
export async function clearMemberAvatar(id: string): Promise<Member | null> {
  const member = await getMemberById(id);
  if (!member) return null;
  if (member.avatar) {
    await deleteImage(member.avatar);
  }
  return updateMember(id, { avatar: undefined });
}

/**
 * Looks up a member by their registered login email
 * (`member.socials.email`, set by an admin). This is how member
 * login works — see app/api/auth/login/route.ts.
 */
export async function findMemberByEmail(email: string): Promise<Member | null> {
  const normalized = email.trim().toLowerCase();
  const row = await prisma.member.findFirst({
    where: { socialEmail: { equals: normalized, mode: "insensitive" } },
  });
  return row ? toMember(row) : null;
}

/** True if some *other* member already has this email registered — two
 *  members sharing an email would make login ambiguous. */
export async function isEmailTakenByAnotherMember(
  email: string,
  excludeMemberId?: string
): Promise<boolean> {
  const existing = await findMemberByEmail(email);
  return !!existing && existing.id !== excludeMemberId;
}

// --- Events --------------------------------------------------------

type EventRow = {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  status: string;
  tags: string[];
  registrationUrl: string | null;
  notifyOnHomepage: boolean;
};

function toEvent(row: EventRow): ChapterEvent {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    location: row.location,
    description: row.description,
    status: row.status as ChapterEvent["status"],
    tags: row.tags,
    registrationUrl: row.registrationUrl ?? undefined,
    notifyOnHomepage: row.notifyOnHomepage,
  };
}

function eventToRow(event: ChapterEvent) {
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    location: event.location,
    description: event.description,
    status: event.status,
    tags: event.tags,
    registrationUrl: event.registrationUrl ?? null,
    notifyOnHomepage: event.notifyOnHomepage ?? false,
  };
}

// Newest-first, matching the old unshift()-on-add ordering.
export async function getEvents(): Promise<ChapterEvent[]> {
  const rows = await prisma.chapterEvent.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toEvent);
}

export async function saveEvents(events: ChapterEvent[]): Promise<void> {
  await prisma.$transaction(
    events.map((e) => {
      const row = eventToRow(e);
      return prisma.chapterEvent.upsert({ where: { id: e.id }, create: row, update: row });
    })
  );
}

export async function addEvent(event: ChapterEvent): Promise<void> {
  await prisma.chapterEvent.create({ data: eventToRow(event) });
}

export async function updateEvent(
  id: string,
  patch: Partial<ChapterEvent>
): Promise<ChapterEvent | null> {
  const data: Prisma.ChapterEventUpdateInput = {};
  if ("title" in patch) data.title = patch.title;
  if ("date" in patch) data.date = patch.date;
  if ("location" in patch) data.location = patch.location;
  if ("description" in patch) data.description = patch.description;
  if ("status" in patch) data.status = patch.status;
  if ("tags" in patch) data.tags = patch.tags;
  if ("registrationUrl" in patch) data.registrationUrl = patch.registrationUrl ?? null;
  if ("notifyOnHomepage" in patch) data.notifyOnHomepage = !!patch.notifyOnHomepage;
  try {
    const row = await prisma.chapterEvent.update({ where: { id }, data });
    return toEvent(row);
  } catch {
    return null;
  }
}

export async function deleteEvent(id: string): Promise<void> {
  await prisma.chapterEvent.delete({ where: { id } }).catch(() => {});
}

// --- Gallery ---------------------------------------------------------

type GalleryRow = {
  id: string;
  caption: string;
  category: string;
  description: string | null;
  image: string | null;
};

function toGalleryItem(row: GalleryRow): GalleryItem {
  return {
    id: row.id,
    caption: row.caption,
    category: row.category,
    description: row.description ?? undefined,
    image: row.image ?? undefined,
  };
}

function galleryToRow(item: GalleryItem) {
  return {
    id: item.id,
    caption: item.caption,
    category: item.category,
    description: item.description ?? null,
    image: item.image ?? null,
  };
}

export async function getGalleryItems(): Promise<GalleryItem[]> {
  const rows = await prisma.galleryItem.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toGalleryItem);
}

export async function getGalleryItemById(id: string): Promise<GalleryItem | null> {
  const row = await prisma.galleryItem.findUnique({ where: { id } });
  return row ? toGalleryItem(row) : null;
}

export async function saveGalleryItems(items: GalleryItem[]): Promise<void> {
  await prisma.$transaction(
    items.map((g) => {
      const row = galleryToRow(g);
      return prisma.galleryItem.upsert({ where: { id: g.id }, create: row, update: row });
    })
  );
}

export async function addGalleryItem(item: GalleryItem): Promise<void> {
  await prisma.galleryItem.create({ data: galleryToRow(item) });
}

export async function updateGalleryItem(
  id: string,
  patch: Partial<GalleryItem>
): Promise<GalleryItem | null> {
  const data: Prisma.GalleryItemUpdateInput = {};
  if ("caption" in patch) data.caption = patch.caption;
  if ("category" in patch) data.category = patch.category;
  if ("description" in patch) data.description = patch.description ?? null;
  if ("image" in patch) data.image = patch.image ?? null;
  try {
    const row = await prisma.galleryItem.update({ where: { id }, data });
    return toGalleryItem(row);
  } catch {
    return null;
  }
}

export async function deleteGalleryItem(id: string): Promise<void> {
  await prisma.galleryItem.delete({ where: { id } }).catch(() => {});
}

// --- Member profile change requests -------------------------------

type ChangeRequestRow = {
  id: string;
  memberId: string;
  memberName: string;
  submittedAt: Date;
  status: string;
  resolvedAt: Date | null;
  kind: string;
  changes: Prisma.JsonValue;
  previous: Prisma.JsonValue;
  emailChange: Prisma.JsonValue;
};

function toChangeRequest(row: ChangeRequestRow): MemberChangeRequest {
  return {
    id: row.id,
    memberId: row.memberId,
    memberName: row.memberName,
    submittedAt: row.submittedAt.toISOString(),
    status: row.status as MemberChangeRequest["status"],
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : undefined,
    kind: row.kind as MemberChangeRequest["kind"],
    changes: (row.changes ?? {}) as Partial<MemberEditableFields>,
    previous: (row.previous ?? {}) as Partial<MemberEditableFields>,
    emailChange: (row.emailChange ?? undefined) as MemberChangeRequest["emailChange"],
  };
}

// Newest-first, matching the old unshift()-on-add ordering.
export async function getChangeRequests(): Promise<MemberChangeRequest[]> {
  const rows = await prisma.memberChangeRequest.findMany({ orderBy: { submittedAt: "desc" } });
  return rows.map(toChangeRequest);
}

/** Replaces the given requests wholesale (matched by id) — used by
 *  the admin approve/reject route to scrub a resolved request's
 *  password hash once it's served its purpose. */
export async function saveChangeRequests(requests: MemberChangeRequest[]): Promise<void> {
  await prisma.$transaction(
    requests.map((r) =>
      prisma.memberChangeRequest.update({
        where: { id: r.id },
        data: {
          memberId: r.memberId,
          memberName: r.memberName,
          submittedAt: new Date(r.submittedAt),
          status: r.status,
          resolvedAt: r.resolvedAt ? new Date(r.resolvedAt) : null,
          kind: r.kind ?? "profile",
          changes: r.changes as Prisma.InputJsonValue,
          previous: r.previous as Prisma.InputJsonValue,
          emailChange: r.emailChange ? (r.emailChange as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      })
    )
  );
}

export interface ChangeRequestPageOptions {
  status?: "pending" | "approved" | "rejected";
  page?: number;
  pageSize?: number;
}

/** Paginated version of getChangeRequests, used for the "recently
 *  resolved" history list in components/admin/requests-panel.tsx once
 *  it grows past a first page. Pending requests are still fetched via
 *  getChangeRequests() (unpaginated) — a review queue an admin is
 *  actively working through should always show every pending item,
 *  and it's expected to stay small since it only grows between
 *  reviews. */
export async function getChangeRequestsPage(
  options: ChangeRequestPageOptions = {}
): Promise<PagedResult<MemberChangeRequest>> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
  const where = options.status ? { status: options.status } : undefined;

  const [rows, total] = await Promise.all([
    prisma.memberChangeRequest.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.memberChangeRequest.count({ where }),
  ]);

  return { items: rows.map(toChangeRequest), total, page, pageSize };
}

export async function getPendingRequestForMember(
  memberId: string,
  kind: "profile" | "email" = "profile"
): Promise<MemberChangeRequest | null> {
  const row = await prisma.memberChangeRequest.findFirst({
    where: { memberId, status: "pending", kind },
  });
  return row ? toChangeRequest(row) : null;
}

/**
 * Adds a new pending request for a member, replacing any pending
 * request of the *same kind* they already had — a member editing
 * their profile again before admin review supersedes their earlier
 * profile request rather than queuing a second one, but a pending
 * profile edit and a pending email change coexist independently since
 * they're reviewed and applied separately.
 */
export async function addChangeRequest(request: MemberChangeRequest): Promise<void> {
  const kind = request.kind ?? "profile";
  const previousPending = await prisma.memberChangeRequest.findFirst({
    where: { memberId: request.memberId, status: "pending", kind },
  });
  if (previousPending) {
    const changes = (previousPending.changes ?? {}) as Partial<MemberEditableFields>;
    if (changes.avatar) await deleteImage(changes.avatar);
    await prisma.memberChangeRequest.delete({ where: { id: previousPending.id } });
  }
  await prisma.memberChangeRequest.create({
    data: {
      id: request.id,
      memberId: request.memberId,
      memberName: request.memberName,
      submittedAt: new Date(request.submittedAt),
      status: request.status,
      resolvedAt: request.resolvedAt ? new Date(request.resolvedAt) : null,
      kind,
      changes: request.changes as Prisma.InputJsonValue,
      previous: request.previous as Prisma.InputJsonValue,
      emailChange: request.emailChange ? (request.emailChange as Prisma.InputJsonValue) : Prisma.JsonNull,
    },
  });
}

export async function resolveChangeRequest(
  id: string,
  status: "approved" | "rejected"
): Promise<MemberChangeRequest | null> {
  const existing = await prisma.memberChangeRequest.findUnique({ where: { id } });
  if (!existing) return null;

  if (status === "rejected") {
    const changes = (existing.changes ?? {}) as Partial<MemberEditableFields>;
    if (changes.avatar) {
      // The photo was already uploaded when the member submitted the
      // request — clean it up since it never went live.
      await deleteImage(changes.avatar);
    }
  }

  const row = await prisma.memberChangeRequest.update({
    where: { id },
    data: { status, resolvedAt: new Date() },
  });
  return toChangeRequest(row);
}

export async function deletePendingRequestForMember(
  memberId: string,
  kind: "profile" | "email" = "profile"
): Promise<void> {
  const target = await prisma.memberChangeRequest.findFirst({
    where: { memberId, status: "pending", kind },
  });
  if (!target) return;
  const changes = (target.changes ?? {}) as Partial<MemberEditableFields>;
  if (changes.avatar) await deleteImage(changes.avatar);
  await prisma.memberChangeRequest.delete({ where: { id: target.id } });
}

// --- Member login credentials --------------------------------------
// Deliberately a separate table from members — see the comment on
// MemberCredential in lib/types.ts for why.

function toCredential(row: {
  memberId: string;
  passwordHash: string;
  passwordUpdatedAt: Date;
}): MemberCredential {
  return {
    memberId: row.memberId,
    passwordHash: row.passwordHash,
    passwordUpdatedAt: row.passwordUpdatedAt.toISOString(),
  };
}

export async function getCredentials(): Promise<MemberCredential[]> {
  const rows = await prisma.memberCredential.findMany();
  return rows.map(toCredential);
}

export async function getCredentialForMember(memberId: string): Promise<MemberCredential | null> {
  const row = await prisma.memberCredential.findUnique({ where: { memberId } });
  return row ? toCredential(row) : null;
}

/** Sets (or replaces) a member's password. Used both when an admin
 *  assigns/changes a member's password directly, and when a member
 *  sets their own via the OTP-verified reset flow. */
export async function setCredentialForMember(memberId: string, passwordHash: string): Promise<void> {
  await prisma.memberCredential.upsert({
    where: { memberId },
    create: { memberId, passwordHash, passwordUpdatedAt: new Date() },
    update: { passwordHash, passwordUpdatedAt: new Date() },
  });
}

export async function deleteCredentialForMember(memberId: string): Promise<void> {
  await prisma.memberCredential.delete({ where: { memberId } }).catch(() => {});
}

// --- Admins (people who can sign in to /admin) -----------------------

function toAdmin(row: {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}): Admin {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role === "owner" ? "owner" : "admin",
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getAdmins(): Promise<Admin[]> {
  const rows = await prisma.admin.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toAdmin);
}

/** Every address that should hear about something needing admin
 *  attention (a new join request, a new profile change request) —
 *  every database-backed admin's email, plus the env-var fallback
 *  admin's address if that's configured, deduplicated. Used by
 *  app/api/join and app/api/member/request-change /
 *  request-email-change; see lib/mailer.ts's sendAdminNotificationEmail. */
export async function getAdminNotificationRecipients(): Promise<string[]> {
  const admins = await getAdmins();
  const addresses = new Set(admins.map((a) => a.email));
  const envAdminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (envAdminEmail) addresses.add(envAdminEmail);
  return Array.from(addresses);
}

export async function countAdmins(): Promise<number> {
  return prisma.admin.count();
}

/** Includes passwordHash, unlike every other Admin-returning function
 *  here — this is the one place (login) that actually needs it. Never
 *  forward the result of this straight into an API response. */
export async function findAdminByEmail(
  email: string
): Promise<(Admin & { passwordHash: string }) | null> {
  const row = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
  if (!row) return null;
  return { ...toAdmin(row), passwordHash: row.passwordHash };
}

export async function isAdminEmailTaken(email: string): Promise<boolean> {
  const row = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
  return !!row;
}

export async function addAdmin(admin: {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "owner" | "admin";
}): Promise<Admin> {
  const row = await prisma.admin.create({
    data: { ...admin, email: admin.email.toLowerCase() },
  });
  return toAdmin(row);
}

export async function updateAdminPassword(id: string, passwordHash: string): Promise<void> {
  await prisma.admin.update({ where: { id }, data: { passwordHash } });
}

/** Promotes/demotes another admin. Only ever called after the caller
 *  (an "owner") has already been verified — see app/api/admin/admins/
 *  [id]/route.ts. */
export async function updateAdminRole(id: string, role: "owner" | "admin"): Promise<Admin | null> {
  try {
    const row = await prisma.admin.update({ where: { id }, data: { role } });
    return toAdmin(row);
  } catch {
    return null;
  }
}

/** True if at least one "owner"-role admin exists other than
 *  (optionally) the one given — used to stop the last owner from
 *  demoting themselves or being demoted, which would leave the site
 *  with no one able to manage admin accounts short of the env-var
 *  fallback login. */
export async function countOtherOwners(excludeId?: string): Promise<number> {
  return prisma.admin.count({
    where: { role: "owner", ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
}

export async function deleteAdmin(id: string): Promise<void> {
  await prisma.admin.delete({ where: { id } });
}

/**
 * Password status for every member with a credential on file — set
 * vs. never set, and when it last changed — WITHOUT the hash. This is
 * deliberately the only password-related thing the admin dashboard can
 * read: hashes are one-way by design (see lib/password.ts), so there
 * is no "current password" to view for any member, admin included.
 * What an admin actually needs — knowing who's set a password and
 * when, and the ability to set a new one for someone locked out — is
 * exactly what this (plus the existing set-password form) provides.
 */
export async function getCredentialStatuses(): Promise<
  Record<string, { hasPassword: boolean; passwordUpdatedAt: string }>
> {
  const credentials = await getCredentials();
  const statuses: Record<string, { hasPassword: boolean; passwordUpdatedAt: string }> = {};
  for (const cred of credentials) {
    statuses[cred.memberId] = {
      hasPassword: true,
      passwordUpdatedAt: cred.passwordUpdatedAt,
    };
  }
  return statuses;
}

// --- OTP requests (email-verified password set/reset) ---------------

function toOtpRequest(row: {
  email: string;
  memberId: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
}): OtpRequest {
  return {
    email: row.email,
    memberId: row.memberId,
    codeHash: row.codeHash,
    expiresAt: row.expiresAt.toISOString(),
    attempts: row.attempts,
  };
}

export async function getOtpRequests(): Promise<OtpRequest[]> {
  const rows = await prisma.otpRequest.findMany();
  return rows.map(toOtpRequest);
}

/** Creates a new OTP for this email, replacing any still-active one —
 *  requesting a fresh code invalidates a previous unused code. */
export async function createOtpRequest(request: OtpRequest): Promise<void> {
  await prisma.otpRequest.deleteMany({
    where: { email: { equals: request.email, mode: "insensitive" } },
  });
  await prisma.otpRequest.create({
    data: {
      email: request.email,
      memberId: request.memberId,
      codeHash: request.codeHash,
      expiresAt: new Date(request.expiresAt),
      attempts: request.attempts,
    },
  });
}

export async function getOtpRequestForEmail(email: string): Promise<OtpRequest | null> {
  const normalized = email.trim().toLowerCase();
  const row = await prisma.otpRequest.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
  });
  return row ? toOtpRequest(row) : null;
}

export async function incrementOtpAttempts(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const row = await prisma.otpRequest.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
  });
  if (!row) return;
  await prisma.otpRequest.update({
    where: { email: row.email },
    data: { attempts: row.attempts + 1 },
  });
}

/** Deletes OTP rows past their expiry — normally each one is already
 *  deleted the moment it's used or superseded (see createOtpRequest /
 *  deleteOtpRequestForEmail above), but a code a member requested and
 *  then never entered is left behind until this runs. Called from the
 *  scheduled cleanup route, see app/api/cron/cleanup/route.ts. */
export async function pruneExpiredOtpRequests(): Promise<number> {
  const result = await prisma.otpRequest.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return result.count;
}

export async function deleteOtpRequestForEmail(email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  await prisma.otpRequest.deleteMany({
    where: { email: { equals: normalized, mode: "insensitive" } },
  });
}

// --- Achievements ----------------------------------------------------

function toAchievement(row: { id: string; title: string; description: string; date: string }): Achievement {
  return { id: row.id, title: row.title, description: row.description, date: row.date };
}

/** Always returns achievements sorted newest-first by `date`, regardless
 *  of what order they happen to be stored in — see parseDateValue() in
 *  lib/utils.ts for how mixed date formats (a full date vs. an older
 *  bare-year record) are compared. */
export async function getAchievements(): Promise<Achievement[]> {
  const rows = await prisma.achievement.findMany();
  return rows.map(toAchievement).sort((a, b) => parseDateValue(b.date) - parseDateValue(a.date));
}

export async function saveAchievements(achievements: Achievement[]): Promise<void> {
  await prisma.$transaction(
    achievements.map((a) =>
      prisma.achievement.upsert({ where: { id: a.id }, create: a, update: a })
    )
  );
}

export async function addAchievement(achievement: Achievement): Promise<void> {
  await prisma.achievement.create({ data: achievement });
}

export async function updateAchievement(
  id: string,
  patch: Partial<Achievement>
): Promise<Achievement | null> {
  const data: Prisma.AchievementUpdateInput = {};
  if ("title" in patch) data.title = patch.title;
  if ("description" in patch) data.description = patch.description;
  if ("date" in patch) data.date = patch.date;
  try {
    const row = await prisma.achievement.update({ where: { id }, data });
    return toAchievement(row);
  } catch {
    return null;
  }
}

export async function deleteAchievement(id: string): Promise<void> {
  await prisma.achievement.delete({ where: { id } }).catch(() => {});
}

// --- Homepage stats (Active Members, Events Hosted, ...) ------------

function toStat(row: { id: string; label: string; value: number; suffix: string | null }): StatItem {
  return { id: row.id, label: row.label, value: row.value, suffix: row.suffix ?? undefined };
}

// Insertion-order, matching the old push()-on-add ordering.
export async function getStats(): Promise<StatItem[]> {
  const rows = await prisma.statItem.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toStat);
}

export async function saveStats(stats: StatItem[]): Promise<void> {
  await prisma.$transaction(
    stats.map((s) => {
      const row = { id: s.id, label: s.label, value: s.value, suffix: s.suffix ?? null };
      return prisma.statItem.upsert({ where: { id: s.id }, create: row, update: row });
    })
  );
}

export async function addStat(stat: StatItem): Promise<void> {
  await prisma.statItem.create({
    data: { id: stat.id, label: stat.label, value: stat.value, suffix: stat.suffix ?? null },
  });
}

export async function updateStat(id: string, patch: Partial<StatItem>): Promise<StatItem | null> {
  const data: Prisma.StatItemUpdateInput = {};
  if ("label" in patch) data.label = patch.label;
  if ("value" in patch) data.value = patch.value;
  if ("suffix" in patch) data.suffix = patch.suffix ?? null;
  try {
    const row = await prisma.statItem.update({ where: { id }, data });
    return toStat(row);
  } catch {
    return null;
  }
}

export async function deleteStat(id: string): Promise<void> {
  await prisma.statItem.delete({ where: { id } }).catch(() => {});
}

// --- Image uploads -------------------------------------------------

/**
 * Uploads an image to Cloudinary and returns its public HTTPS URL to
 * store on the member/gallery record. Works from any host, including
 * serverless (Vercel/Netlify), unlike the local-disk version this
 * replaced.
 */
export async function saveUploadedImage(file: File, folder: "members" | "gallery"): Promise<string> {
  return uploadImage(file, folder);
}

/**
 * Removes a previously-uploaded image given its Cloudinary URL. Used
 * to clean up photos from rejected or superseded change requests so
 * they don't accumulate forever. Silently does nothing for URLs that
 * aren't ours.
 */
export async function deleteUploadedImage(url: string): Promise<void> {
  return deleteImage(url);
}

// --- Join requests (public "Join" form submissions) ------------------

function toJoinRequest(row: {
  id: string;
  name: string;
  email: string;
  branch: string;
  year: string;
  message: string | null;
  resumeUrl: string | null;
  submittedAt: Date;
  status: string;
}): JoinRequest {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    branch: row.branch,
    year: row.year,
    message: row.message ?? undefined,
    resumeUrl: row.resumeUrl ?? undefined,
    submittedAt: row.submittedAt.toISOString(),
    status: row.status as JoinRequestStatus,
  };
}

// Newest-first, so an admin sees fresh submissions at the top.
export async function getJoinRequests(): Promise<JoinRequest[]> {
  const rows = await prisma.joinRequest.findMany({ orderBy: { submittedAt: "desc" } });
  return rows.map(toJoinRequest);
}

export interface JoinRequestPageOptions {
  status?: JoinRequestStatus;
  page?: number;
  pageSize?: number;
}

/** Paginated version of getJoinRequests, for the admin Join Requests
 *  tab once submissions run into the hundreds/thousands over a
 *  chapter's lifetime — see components/admin/join-requests-panel.tsx.
 *  getJoinRequests() above is left untouched for any other caller. */
export async function getJoinRequestsPage(
  options: JoinRequestPageOptions = {}
): Promise<PagedResult<JoinRequest>> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 20));
  const where = options.status ? { status: options.status } : undefined;

  const [rows, total] = await Promise.all([
    prisma.joinRequest.findMany({
      where,
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.joinRequest.count({ where }),
  ]);

  return { items: rows.map(toJoinRequest), total, page, pageSize };
}

/** Total count of unreviewed ("new") join requests — used for the
 *  admin dashboard tab's live badge independent of whatever page of
 *  results is currently loaded, see the Join Requests API route. */
export async function countNewJoinRequests(): Promise<number> {
  return prisma.joinRequest.count({ where: { status: "new" } });
}

/** Bulk status update, for the Join Requests tab's multi-select
 *  actions (e.g. "Mark 12 as contacted"). Ignores ids that don't
 *  exist rather than failing the whole batch over one stale row. */
export async function bulkUpdateJoinRequestStatus(
  ids: string[],
  status: JoinRequestStatus
): Promise<number> {
  if (ids.length === 0) return 0;
  const result = await prisma.joinRequest.updateMany({ where: { id: { in: ids } }, data: { status } });
  return result.count;
}

/** Bulk delete, for the Join Requests tab's multi-select actions. */
export async function bulkDeleteJoinRequests(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const result = await prisma.joinRequest.deleteMany({ where: { id: { in: ids } } });
  return result.count;
}

export async function addJoinRequest(request: JoinRequest): Promise<void> {
  await prisma.joinRequest.create({
    data: {
      id: request.id,
      name: request.name,
      email: request.email,
      branch: request.branch,
      year: request.year,
      message: request.message ?? null,
      resumeUrl: request.resumeUrl ?? null,
      submittedAt: new Date(request.submittedAt),
      status: request.status,
    },
  });
}

export async function updateJoinRequestStatus(
  id: string,
  status: JoinRequestStatus
): Promise<JoinRequest | null> {
  try {
    const row = await prisma.joinRequest.update({ where: { id }, data: { status } });
    return toJoinRequest(row);
  } catch {
    return null;
  }
}

export async function deleteJoinRequest(id: string): Promise<void> {
  await prisma.joinRequest.delete({ where: { id } }).catch(() => {});
}

// --- Login activity (admin "Activity" tab) --------------------------

function toLoginEvent(row: {
  id: string;
  memberId: string;
  memberName: string;
  loggedInAt: Date;
  userAgent: string | null;
}): LoginEvent {
  return {
    id: row.id,
    memberId: row.memberId,
    memberName: row.memberName,
    loggedInAt: row.loggedInAt.toISOString(),
    userAgent: row.userAgent ?? undefined,
  };
}

/** Records a successful member login. Called from
 *  app/api/auth/login/route.ts right after a password check passes —
 *  never for failed attempts, and never for admin logins (there's
 *  only ever one or two admins, so an admin watching their own login
 *  history isn't useful the way seeing member activity is). */
export async function addLoginEvent(
  memberId: string,
  memberName: string,
  userAgent?: string
): Promise<void> {
  await prisma.loginEvent.create({
    data: { memberId, memberName, userAgent: userAgent ?? null },
  });
}

/** Most recent logins, newest first, for the admin dashboard's
 *  Activity tab. That tab polls this on an interval to feel live —
 *  see components/admin/login-activity-panel.tsx. */
export async function getRecentLoginEvents(limit = 100): Promise<LoginEvent[]> {
  const rows = await prisma.loginEvent.findMany({
    orderBy: { loggedInAt: "desc" },
    take: limit,
  });
  return rows.map(toLoginEvent);
}

/** Deletes login-activity rows older than `days` — this table is
 *  append-only (one row per successful member login, forever) with no
 *  other cleanup, so left alone it grows without bound over the life
 *  of the chapter. Called from the scheduled cleanup route (see
 *  app/api/cron/cleanup/route.ts); safe to also run by hand from
 *  `npx prisma studio` or a one-off script. Returns the number of
 *  rows removed, purely for the cleanup route's response/logging. */
export async function pruneOldLoginEvents(days = 90): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await prisma.loginEvent.deleteMany({ where: { loggedInAt: { lt: cutoff } } });
  return result.count;
}

// --- Resume/CV uploads (public "Join" form) --------------------------

/**
 * Uploads a resume/CV to Cloudinary as a raw file (not an image —
 * PDFs and Word docs go through a different Cloudinary resource type
 * than photos) and returns its public HTTPS URL to store on the join
 * request. See saveUploadedImage above for the equivalent for photos.
 */
export async function saveUploadedResume(file: File): Promise<string> {
  return uploadRawFile(file, "resumes");
}

// --- Cached homepage read (public site only) --------------------------
// getMembers/getEvents/getGalleryItems/getStats/getAchievements above
// stay uncached and are what every admin route calls directly, so the
// dashboard always sees the instant the moment it saves something.
// app/page.tsx is a different case: it's the one place these five
// queries all run together on *every single visitor's* page load, so
// this wraps that combined read in Next's Data Cache for up to 60
// seconds, cutting repeat-visitor database load without touching the
// admin-facing functions' always-fresh behavior at all. (The page
// itself still renders per-request — it reads the visitor's own login
// cookie to personalize the navbar, so it can't be full-page ISR
// cached without risking one visitor's session leaking into another's
// cached HTML. This caches only the shared data underneath that.)
export const getPublicHomepageContent = unstable_cache(
  async () => {
    const [members, events, galleryItems, stats, achievements] = await Promise.all([
      getMembers(),
      getEvents(),
      getGalleryItems(),
      getStats(),
      getAchievements(),
    ]);
    return { members, events, galleryItems, stats, achievements };
  },
  ["public-homepage-content"],
  { revalidate: 60, tags: ["homepage-content"] }
);

/** Called from every admin route that changes members, events,
 *  gallery, stats, or achievements, so an edit shows up on the public
 *  site immediately rather than waiting up to 60 seconds for
 *  getPublicHomepageContent's cache to expire on its own. */
export function revalidateHomepageContent(): void {
  revalidateTag("homepage-content");
}


// See the comment on the PageView model in prisma/schema.prisma for
// what this deliberately does and doesn't track.

function todayDateKey(): string {
  // UTC, not server-local time — consistent regardless of which
  // region a serverless invocation happens to run in.
  return new Date().toISOString().slice(0, 10);
}

/** Increments today's view counter for `path` by one. Called from
 *  POST /api/track once per page load (see
 *  components/analytics/page-view-tracker.tsx). One upsert, so
 *  concurrent hits on the same path/day never race-overwrite each
 *  other the way a read-then-write would. */
export async function trackPageView(path: string): Promise<void> {
  const date = todayDateKey();
  await prisma.pageView.upsert({
    where: { date_path: { date, path } },
    create: { date, path, count: 1 },
    update: { count: { increment: 1 } },
  });
}

/** Daily totals for the last `days` days (including days with zero
 *  views, so the admin Overview chart has an even x-axis) plus the
 *  most-viewed paths across that same window. */
export async function getPageViewSummary(
  days = 30
): Promise<{ daily: DailyPageViews[]; topPaths: PathPageViews[] }> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);

  const rows = await prisma.pageView.findMany({
    where: { date: { gte: since.toISOString().slice(0, 10) } },
  });

  const byDate = new Map<string, number>();
  const byPath = new Map<string, number>();
  for (const row of rows as { date: string; path: string; count: number }[]) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + row.count);
    byPath.set(row.path, (byPath.get(row.path) ?? 0) + row.count);
  }

  const daily: DailyPageViews[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    daily.push({ date: key, views: byDate.get(key) ?? 0 });
  }

  const topPaths: PathPageViews[] = Array.from(byPath.entries())
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  return { daily, topPaths };
}

/** Everything the admin Overview tab shows in one call — counts
 *  derived from existing tables (cheap: they're all indexed lookups
 *  or small tables) plus the page-view summary above. */
export async function getOverviewStats(): Promise<OverviewStats> {
  const [
    memberCount,
    upcomingEventCount,
    pastEventCount,
    pendingChangeRequestCount,
    newJoinRequestCount,
    contactedJoinRequestCount,
    archivedJoinRequestCount,
    { daily, topPaths },
  ] = await Promise.all([
    prisma.member.count(),
    prisma.chapterEvent.count({ where: { status: { in: ["upcoming", "live"] } } }),
    prisma.chapterEvent.count({ where: { status: "past" } }),
    prisma.memberChangeRequest.count({ where: { status: "pending" } }),
    prisma.joinRequest.count({ where: { status: "new" } }),
    prisma.joinRequest.count({ where: { status: "contacted" } }),
    prisma.joinRequest.count({ where: { status: "archived" } }),
    getPageViewSummary(30),
  ]);

  return {
    memberCount,
    upcomingEventCount,
    pastEventCount,
    pendingChangeRequestCount,
    newJoinRequestCount,
    joinRequestFunnel: {
      new: newJoinRequestCount,
      contacted: contactedJoinRequestCount,
      archived: archivedJoinRequestCount,
    },
    last30DaysViews: daily,
    topPaths,
  };
}
