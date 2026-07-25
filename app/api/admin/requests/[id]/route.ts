import { NextResponse } from "next/server";
import {
  resolveChangeRequest,
  updateMember,
  getChangeRequests,
  getMemberById,
  isEmailTakenByAnotherMember,
  setCredentialForMember,
  saveChangeRequests,
} from "@/lib/content-store";

// Every request must hit this handler fresh — GET routes with no
// per-request API usage can otherwise get statically pre-rendered
// at build time and silently serve stale data forever.
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { action } = await request.json();
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const requests = await getChangeRequests();
  const target = requests.find((r) => r.id === params.id);
  if (!target) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }
  if (target.status !== "pending") {
    return NextResponse.json(
      { error: "This request has already been resolved." },
      { status: 409 }
    );
  }

  const kind = target.kind ?? "profile";

  if (action === "approve") {
    const member = await getMemberById(target.memberId);
    if (!member) {
      return NextResponse.json(
        { error: "That member no longer exists." },
        { status: 404 }
      );
    }

    if (kind === "email") {
      const emailChange = target.emailChange;
      if (!emailChange) {
        return NextResponse.json({ error: "Malformed email request." }, { status: 400 });
      }
      // Re-check uniqueness at approval time, not just submission time —
      // another member could have been given that same email in the
      // meantime (by an admin, or via a different approved request).
      if (await isEmailTakenByAnotherMember(emailChange.newEmail, member.id)) {
        return NextResponse.json(
          { error: "Another member is now registered with that email. Reject this request and ask the member to try a different one." },
          { status: 409 }
        );
      }
      await updateMember(member.id, {
        socials: { ...member.socials, email: emailChange.newEmail },
      });
      await setCredentialForMember(member.id, emailChange.passwordHash);
    } else {
      const { github, linkedin, portfolio, ...rest } = target.changes;
      const memberPatch: Record<string, unknown> = { ...rest };
      if (github !== undefined || linkedin !== undefined || portfolio !== undefined) {
        // `socials` is a nested object, so a plain patch would shallow-
        // overwrite the whole thing — merge onto the member's *current*
        // socials so `email` (never part of a "profile"-kind request)
        // survives approval untouched.
        memberPatch.socials = {
          ...member.socials,
          ...(github !== undefined ? { github } : {}),
          ...(linkedin !== undefined ? { linkedin } : {}),
          ...(portfolio !== undefined ? { portfolio } : {}),
        };
      }
      await updateMember(target.memberId, memberPatch);
    }
  }

  const resolved = await resolveChangeRequest(
    params.id,
    action === "approve" ? "approved" : "rejected"
  );

  // The password hash only ever existed to survive the trip from
  // submission to this moment — once resolved (either way) it's
  // served its purpose, so scrub it rather than let a bcrypt hash
  // linger indefinitely in the resolved-requests history.
  if (resolved && kind === "email" && resolved.emailChange) {
    const all = await getChangeRequests();
    const idx = all.findIndex((r) => r.id === resolved.id);
    if (idx !== -1) {
      all[idx] = {
        ...all[idx],
        emailChange: { ...all[idx].emailChange!, passwordHash: "" },
      };
      await saveChangeRequests(all);
    }
  }

  return NextResponse.json(resolved);
}
