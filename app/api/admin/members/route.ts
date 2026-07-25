import { NextResponse } from "next/server";
import {
  addMember,
  getMembers,
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

export async function GET() {
  const members = await getMembers();
  return NextResponse.json(members);
}

export async function POST(request: Request) {
  const formData = await request.formData();

  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const team = String(formData.get("team") ?? "").trim();

  if (!name || !role || !team) {
    return NextResponse.json(
      { error: "Name, role, and team are required." },
      { status: 400 }
    );
  }

  const email = String(formData.get("email") ?? "").trim();
  if (email && (await isEmailTakenByAnotherMember(email))) {
    return NextResponse.json(
      { error: "Another member is already registered with that email." },
      { status: 409 }
    );
  }

  const password = String(formData.get("password") ?? "");
  if (password && password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }
  if (password && !email) {
    return NextResponse.json(
      {
        error:
          "Add a login email before setting an initial password — otherwise this member won't be able to sign in with it.",
      },
      { status: 400 }
    );
  }

  let avatar: string | undefined;
  const avatarFile = formData.get("avatarFile");
  if (avatarFile instanceof File && avatarFile.size > 0) {
    avatar = await saveUploadedImage(avatarFile, "members");
  }

  const skills = String(formData.get("skills") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const member: Member = {
    id: `m-${Date.now().toString(36)}`,
    name,
    role,
    team,
    year: String(formData.get("year") ?? ""),
    branch: String(formData.get("branch") ?? ""),
    bio: String(formData.get("bio") ?? ""),
    skills,
    avatar,
    socials: {
      github: String(formData.get("github") ?? "") || undefined,
      linkedin: String(formData.get("linkedin") ?? "") || undefined,
      email: email || undefined,
      portfolio: String(formData.get("portfolio") ?? "") || undefined,
    },
  };

  await addMember(member);
  if (password) {
    await setCredentialForMember(member.id, await hashPassword(password));
  }
  return NextResponse.json(member, { status: 201 });
}
