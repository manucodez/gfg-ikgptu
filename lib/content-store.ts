import { Prisma } from "@prisma/client";
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
  };
}

export async function getMembers(): Promise<Member[]> {
  const rows = await prisma.member.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toMember);
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
 *  in the admin Members tab. */
export async function reorderMembers(orderedIds: string[]): Promise<void> {
  await prisma.$transaction(
    orderedIds.map((id, index) => prisma.member.update({ where: { id }, data: { sortOrder: index } }))
  );
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

function toAdmin(row: { id: string; name: string; email: string; createdAt: Date }): Admin {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getAdmins(): Promise<Admin[]> {
  const rows = await prisma.admin.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toAdmin);
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
}): Promise<Admin> {
  const row = await prisma.admin.create({
    data: { ...admin, email: admin.email.toLowerCase() },
  });
  return toAdmin(row);
}

export async function updateAdminPassword(id: string, passwordHash: string): Promise<void> {
  await prisma.admin.update({ where: { id }, data: { passwordHash } });
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
