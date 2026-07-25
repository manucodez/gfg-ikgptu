import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  getMemberById,
  addChangeRequest,
  saveUploadedImage,
  deletePendingRequestForMember,
} from "@/lib/content-store";
import { SESSION_COOKIES, verifySessionToken, type MemberSessionPayload } from "@/lib/session";
import { isValidUrl } from "@/lib/validation";
import type { MemberChangeRequest, MemberEditableFields } from "@/lib/types";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

async function getCurrentMember() {
  const token = cookies().get(SESSION_COOKIES.member)?.value;
  const session = token ? await verifySessionToken<MemberSessionPayload>(token) : null;
  if (!session) return null;
  return getMemberById(session.sub);
}

const URL_FIELDS = ["github", "linkedin", "portfolio"] as const;

export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const formData = await request.formData();
  const changes: Partial<MemberEditableFields> = {};
  const previous: Partial<MemberEditableFields> = {};

  // The form always submits every field, whether or not the member
  // touched it — only record a field here if the submitted value is
  // actually different from what's live, so the admin's Requests tab
  // shows a real diff instead of every field every time.
  const textFields = ["year", "branch", "bio"] as const;
  for (const field of textFields) {
    const value = formData.get(field);
    if (value !== null) {
      const trimmed = String(value).trim();
      if (trimmed !== member[field].trim()) {
        changes[field] = trimmed;
        previous[field] = member[field];
      }
    }
  }

  const skillsRaw = formData.get("skills");
  if (skillsRaw !== null) {
    const skills = String(skillsRaw)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (JSON.stringify(skills) !== JSON.stringify(member.skills)) {
      changes.skills = skills;
      previous.skills = member.skills;
    }
  }

  for (const field of URL_FIELDS) {
    const raw = formData.get(field);
    if (raw !== null) {
      const value = String(raw).trim();
      if (value && !isValidUrl(value)) {
        return NextResponse.json(
          { error: `${field[0].toUpperCase()}${field.slice(1)} must be a valid http(s) link.` },
          { status: 400 }
        );
      }
      const currentValue = member.socials[field] ?? "";
      if (value !== currentValue) {
        // Store the plain string ("" for "cleared") — never `undefined`,
        // which JSON.stringify drops and would make a cleared link
        // indistinguishable from an untouched one once saved to disk.
        changes[field] = value;
        previous[field] = currentValue;
      }
    }
  }

  const avatarFile = formData.get("avatarFile");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    changes.avatar = await saveUploadedImage(avatarFile, "members");
    previous.avatar = member.avatar;
  }

  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ error: "No changes to submit." }, { status: 400 });
  }

  const changeRequest: MemberChangeRequest = {
    id: `req-${Date.now().toString(36)}`,
    memberId: member.id,
    memberName: member.name,
    submittedAt: new Date().toISOString(),
    status: "pending",
    changes,
    previous,
  };

  await addChangeRequest(changeRequest);
  return NextResponse.json(changeRequest, { status: 201 });
}

export async function DELETE() {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  await deletePendingRequestForMember(member.id);
  return NextResponse.json({ ok: true });
}
