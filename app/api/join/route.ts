import { NextResponse } from "next/server";
import { addJoinRequest, saveUploadedResume } from "@/lib/content-store";
import { isValidEmail } from "@/lib/validation";
import type { JoinRequest } from "@/lib/types";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever. (This route is
// POST-only, but the convention is kept consistent across app/api/**.)
export const dynamic = "force-dynamic";

const ALLOWED_RESUME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5MB

// Deliberately public — no session required, unlike everything under
// /api/admin and /api/member. Anyone on the homepage can submit this.
// FormData (not JSON) since the form can include a resume file.
export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const branch = String(formData.get("branch") ?? "").trim();
  const year = String(formData.get("year") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !branch || !year) {
    return NextResponse.json({ error: "Name, branch, and year are required." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  let resumeUrl: string | undefined;
  const resumeFile = formData.get("resume");
  if (resumeFile instanceof File && resumeFile.size > 0) {
    if (!ALLOWED_RESUME_TYPES.includes(resumeFile.type)) {
      return NextResponse.json(
        { error: "Resume must be a PDF or Word document." },
        { status: 400 }
      );
    }
    if (resumeFile.size > MAX_RESUME_BYTES) {
      return NextResponse.json({ error: "Resume must be under 5MB." }, { status: 400 });
    }
    resumeUrl = await saveUploadedResume(resumeFile);
  }

  const joinRequest: JoinRequest = {
    id: `j-${Date.now().toString(36)}`,
    name,
    email,
    branch,
    year,
    message: message || undefined,
    resumeUrl,
    submittedAt: new Date().toISOString(),
    status: "new",
  };

  await addJoinRequest(joinRequest);
  return NextResponse.json({ ok: true }, { status: 201 });
}
