import { NextResponse } from "next/server";
import { addJoinRequest, getAdminNotificationRecipients, saveUploadedResume } from "@/lib/content-store";
import { sendAdminNotificationEmail } from "@/lib/mailer";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { joinRequestSchema, firstZodError } from "@/lib/schemas";
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
  const ip = getClientIp(request);
  const { ok, retryAfterSeconds } = await checkRateLimit(`join:ip:${ip}`, 5, 60 * 60_000);
  if (!ok) return rateLimitResponse(retryAfterSeconds ?? 3600);

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const branch = String(formData.get("branch") ?? "").trim();
  const year = String(formData.get("year") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  const parsed = joinRequestSchema.safeParse({ name, email, branch, year, message });
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed) }, { status: 400 });
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

  // Fire-and-forget: a notification failing (or Gmail not being
  // configured, in which case this just logs) should never make the
  // actual join submission fail for the applicant.
  getAdminNotificationRecipients()
    .then((recipients) =>
      sendAdminNotificationEmail(
        recipients,
        `New join request from ${name}`,
        `<p><strong>${name}</strong> (${branch}, Year ${year}) submitted a join request.</p>
         <p>Email: ${email}</p>
         ${message ? `<p>Message: ${message}</p>` : ""}
         <p>Review it from the admin dashboard's Join Requests tab.</p>`,
        `${name} (${branch}, Year ${year}) submitted a join request.\nEmail: ${email}\n${message ? `Message: ${message}\n` : ""}Review it from the admin dashboard's Join Requests tab.`
      )
    )
    .catch(() => {});

  return NextResponse.json({ ok: true }, { status: 201 });
}
