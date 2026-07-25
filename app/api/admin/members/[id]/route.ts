import { NextResponse } from "next/server";
import {
  deleteMember,
  updateMember,
  getMemberById,
  saveUploadedImage,
  isEmailTakenByAnotherMember,
  setCredentialForMember,
} from "@/lib/content-store";
import { hashPassword } from "@/lib/password";
import type { Member } from "@/lib/types";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Looked up first, and used as the source of truth for "does this
  // member currently have a login email" below — fixes a bug where a
  // password could get written to credentials.json for an id that
  // doesn't actually correspond to any member (an orphaned credential
  // no future request would ever clean up), because that write used
  // to happen before this existence check.
  const existingMember = await getMemberById(params.id);
  if (!existingMember) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const formData = await request.formData();
  const patch: Partial<Member> = {};

  const textFields = ["name", "role", "team", "year", "branch", "bio"] as const;
  for (const field of textFields) {
    const value = formData.get(field);
    if (value !== null) patch[field] = String(value);
  }

  const skillsRaw = formData.get("skills");
  if (skillsRaw !== null) {
    patch.skills = String(skillsRaw)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const avatarFile = formData.get("avatarFile");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    patch.avatar = await saveUploadedImage(avatarFile, "members");
  }

  const socialFields = ["github", "linkedin", "email", "portfolio"] as const;
  const hasSocialField = socialFields.some((f) => formData.get(f) !== null);
  if (hasSocialField) {
    const email = String(formData.get("email") ?? "").trim();
    if (email && (await isEmailTakenByAnotherMember(email, params.id))) {
      return NextResponse.json(
        { error: "Another member is already registered with that email." },
        { status: 409 }
      );
    }
    patch.socials = {
      github: String(formData.get("github") ?? "") || undefined,
      linkedin: String(formData.get("linkedin") ?? "") || undefined,
      email: email || undefined,
      portfolio: String(formData.get("portfolio") ?? "") || undefined,
    };
  }

  const password = formData.get("password");
  if (password !== null && String(password).length > 0) {
    if (String(password).length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }
    // The email this member will have *after* this save — either what
    // this same request is setting it to, or, if the email field
    // wasn't touched, whatever's already on file. Login is by email,
    // so setting a password with neither is a dead end an admin could
    // easily miss (the save otherwise "succeeds" silently).
    const effectiveEmail = patch.socials?.email ?? existingMember.socials.email;
    if (!effectiveEmail) {
      return NextResponse.json(
        {
          error:
            "Add a login email for this member before setting a password — otherwise they won't be able to sign in with it.",
        },
        { status: 400 }
      );
    }
    await setCredentialForMember(params.id, await hashPassword(String(password)));
  }

  const updated = await updateMember(params.id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  await deleteMember(params.id);
  return NextResponse.json({ ok: true });
}
