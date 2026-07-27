import { Resend } from "resend";

// Only constructed when a key is actually present, so local dev
// without a Resend account doesn't crash — see the fallback in
// sendOtpEmail below.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Who OTP emails appear to come from. Must be an address at a domain
// verified in Resend's dashboard (resend.com/domains) — until a
// domain is verified, Resend only accepts onboarding@resend.dev as
// the sender, which works fine for testing but isn't something you'd
// want members actually seeing in their inbox long-term.
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? "GFG Campus Chapter <onboarding@resend.dev>";

/** Thrown when Resend accepts the request but reports the send
 *  itself failed (bad/unverified from-address, invalid recipient,
 *  rate limit, etc.) — lets the calling route tell the person their
 *  code never actually went out, instead of silently succeeding. */
export class MailerError extends Error {}

/**
 * Sends the OTP verification email via Resend (https://resend.com).
 * See BACKEND.md for how to get a RESEND_API_KEY. Without one set,
 * this falls back to logging the code to the server console, so
 * local development keeps working without requiring a Resend account.
 */
export async function sendOtpEmail(email: string, code: string): Promise<void> {
  if (!resend) {
    console.log(
      `\n📧 [DEV EMAIL — RESEND_API_KEY not set] OTP for ${email}: ${code} (expires in 10 minutes)\n`
    );
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: `${code} is your verification code`,
    html: otpEmailHtml(code),
    text: `Your verification code is ${code}. It expires in 10 minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
  });

  if (error) {
    throw new MailerError(error.message);
  }
}

function otpEmailHtml(code: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#111827;">
  <p style="font-size:13px;color:#6b7280;margin:0 0 8px;letter-spacing:0.02em;">GFG CAMPUS CHAPTER · IKGPTU</p>
  <h1 style="font-size:20px;margin:0 0 16px;">Your verification code</h1>
  <p style="font-size:15px;color:#374151;line-height:1.5;margin:0 0 24px;">
    Enter this code to set or reset your password. It expires in 10 minutes.
  </p>
  <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f3f4f6;border-radius:12px;padding:16px 24px;text-align:center;margin:0 0 24px;">
    ${code}
  </div>
  <p style="font-size:13px;color:#9ca3af;margin:0;">
    If you didn't request this, you can safely ignore this email.
  </p>
</div>`;
}
