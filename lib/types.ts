// `team` is a free-text field rather than a fixed union: the admin
// dashboard lets whoever's running the chapter create new teams at
// any time, and a hardcoded union here previously drifted out of
// sync with real data (a stale team list broke both the build and
// the member search/filter). Team names shown as filter options are
// always derived from the actual member list — see member-section.tsx.
export type Team = string;

export interface Member {
  id: string;
  name: string;
  role: string;
  team: Team;
  year: string; // e.g. "3rd Year"
  branch: string; // e.g. "B.Tech CSE"
  bio: string;
  skills: string[];
  /** Optional image path/URL. Falls back to an initials tile when absent. */
  avatar?: string;
  socials: {
    github?: string;
    linkedin?: string;
    email?: string;
    portfolio?: string;
  };
}

export type EventStatus = "upcoming" | "live" | "past";
export const EVENT_STATUSES: EventStatus[] = ["upcoming", "live", "past"];

// Free-text, like `Team` above — an event's tags aren't limited to the
// suggested list below. SUGGESTED_EVENT_TAGS just seeds the admin
// event form with one-click common options; admins can also type any
// custom tag of their own (e.g. "Alumni Meet", "AI/ML"), which is why
// EventTag is `string` rather than a fixed union.
export type EventTag = string;
export const SUGGESTED_EVENT_TAGS: EventTag[] = [
  "Workshop",
  "Hackathon",
  "Contest",
  "Bootcamp",
  "Session",
];
/** @deprecated use SUGGESTED_EVENT_TAGS — kept as an alias so any
 *  external references don't break. */
export const EVENT_TAGS = SUGGESTED_EVENT_TAGS;

export interface ChapterEvent {
  id: string;
  title: string;
  date: string; // display string, e.g. "14 Aug 2026"
  location: string;
  description: string;
  status: EventStatus;
  tags: EventTag[];
  /** Where the "Register now" button on the event's detail card sends
   *  people — a Google Form link or any other external URL. Optional:
   *  until an admin sets one, the button shows a "coming soon" state
   *  instead of a dead link. */
  registrationUrl?: string;
  /** If true, this event also appears as a banner in the homepage
   *  announcement strip (see components/announcement.tsx). Toggled
   *  from the admin event form — "Add this notification to page". */
  notifyOnHomepage?: boolean;
}

export interface GalleryItem {
  id: string;
  caption: string;
  category: string;
  /** Optional longer write-up shown alongside the photo (the caption
   *  stays a short title/label). Entirely optional — older items and
   *  quick uploads can leave it blank. */
  description?: string;
  /** Optional image path/URL. Falls back to a labeled placeholder tile. */
  image?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  /** ISO date string (YYYY-MM-DD), set via a native date picker in the
   *  admin form. Achievements are sorted by this field, newest first —
   *  see getAchievements() in lib/content-store.ts. */
  date: string;
}

export interface StatItem {
  id: string;
  label: string;
  value: number;
  suffix?: string;
}

/**
 * Fields a member is allowed to edit about themselves from their
 * dashboard. Deliberately narrow — identity and org-structure fields
 * (name, role, team) stay admin-only and never flow through a change
 * request. Their login/contact email *can* be proposed by the member,
 * but only through the separate, more tightly-scoped email-change flow
 * below (kind: "email") — never bundled in with everyday profile edits
 * like bio or skills. Everything here goes through admin approval
 * before it becomes live on the public site — see MemberChangeRequest.
 */
export interface MemberEditableFields {
  avatar?: string;
  year: string;
  branch: string;
  bio: string;
  skills: string[];
  /** Empty string means "no link" — not `undefined`, which `JSON.stringify`
   *  silently drops and would make "member cleared this" indistinguishable
   *  from "member never touched this field" once written to disk. */
  github: string;
  linkedin: string;
  portfolio: string;
}

export type ChangeRequestStatus = "pending" | "approved" | "rejected";

/** What a change request is asking for: an everyday profile edit
 *  (bio, skills, photo, links, year/branch), or a change of login
 *  email + password. Kept as distinct request "kinds" — rather than
 *  folding email into MemberEditableFields — because an email change
 *  also carries a new password hash and needs its own admin-facing
 *  review copy ("old email → new email") instead of a generic field
 *  diff. Missing/undefined `kind` on older records means "profile",
 *  for backward compatibility with requests written before this
 *  distinction existed. */
export type ChangeRequestKind = "profile" | "email";

/** A member's proposed profile edit — or email/password change —
 *  awaiting admin review. */
export interface MemberChangeRequest {
  id: string;
  memberId: string;
  memberName: string;
  submittedAt: string; // ISO timestamp
  status: ChangeRequestStatus;
  resolvedAt?: string;
  kind?: ChangeRequestKind;
  /** The fields the member is asking to change. Populated for kind "profile"; empty for "email". */
  changes: Partial<MemberEditableFields>;
  /** A snapshot of those same fields' current values, for an admin diff view. */
  previous: Partial<MemberEditableFields>;
  /** Populated only for kind "email". The member proves nothing about
   *  the new address up front (no OTP round-trip to it) — admin review
   *  is the trust gate here, same as for any other profile change. The
   *  password is hashed the moment it's submitted, never stored plain,
   *  and only written to credentials.json once an admin approves. */
  emailChange?: {
    previousEmail: string;
    newEmail: string;
    passwordHash: string;
  };
}

/**
 * A member's login password, stored separately from `content/members.json`
 * on purpose: Member records get read straight into public page props
 * (the member grid, the hero preview), so a password hash must never
 * live on that object — even server-side-only — or a future change to
 * what those props include could leak it to the browser. Keyed by
 * memberId, not email, since email lives on the Member record.
 */
export interface MemberCredential {
  memberId: string;
  passwordHash: string;
  /** ISO timestamp of the last time this password was set — by the
   *  member (via the OTP reset flow) or by an admin. Safe to surface
   *  to the admin dashboard as-is: unlike the hash, a timestamp reveals
   *  nothing about the password itself. */
  passwordUpdatedAt: string;
}

/**
 * A one-time code for verifying email ownership before setting or
 * resetting a password. Short-lived and single-use — see lib/otp.ts.
 */
export interface OtpRequest {
  email: string;
  memberId: string;
  codeHash: string;
  expiresAt: string; // ISO timestamp
  attempts: number;
}

export type JoinRequestStatus = "new" | "contacted" | "archived";

/**
 * A submission from the public "Join" form on the homepage
 * (components/contact/contact-section.tsx) — someone interested in
 * joining, not yet a Member. Deliberately unconnected to Member:
 * reviewing and following up (from the admin Join Requests tab)
 * doesn't automatically create a Member record, since membership
 * involves more than what this short form collects.
 */
export interface JoinRequest {
  id: string;
  name: string;
  email: string;
  branch: string;
  year: string;
  /** Optional — "what would you like to contribute or learn?" */
  message?: string;
  /** Cloudinary URL of an uploaded resume/CV, if the person attached one. */
  resumeUrl?: string;
  submittedAt: string; // ISO timestamp
  status: JoinRequestStatus;
}

/**
 * A record of one successful member login — powers the admin
 * dashboard's Activity tab so an admin can see who's actively using
 * their account. Deliberately doesn't track IP address (privacy);
 * userAgent is included since "logged in from an iPhone" is useful
 * context without being as sensitive as a precise IP/location.
 */
export interface LoginEvent {
  id: string;
  memberId: string;
  memberName: string;
  loggedInAt: string; // ISO timestamp
  userAgent?: string;
}
