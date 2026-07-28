import nodemailer from "nodemailer";

// Only constructed when credentials are actually present, so local
// dev without Gmail configured doesn't crash — see the fallback in
// sendOtpEmail below. Gmail SMTP needs an **App Password**, not your
// regular account password — see BACKEND.md for how to generate one
// (requires 2-Step Verification to be turned on for the account).
const transporter =
  process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      })
    : null;

const FROM_ADDRESS = process.env.GMAIL_USER
  ? `GFG Campus Chapter <${process.env.GMAIL_USER}>`
  : undefined;

/** Thrown when Gmail's SMTP server accepts the connection but the
 *  send itself fails (wrong app password, invalid recipient, Gmail's
 *  daily sending limit hit, etc.) — lets the calling route tell the
 *  person their code never actually went out, instead of silently
 *  claiming success. */
export class MailerError extends Error {}

/**
 * Sends the OTP verification email via Gmail SMTP (using nodemailer).
 * See BACKEND.md for how to set up GMAIL_USER/GMAIL_APP_PASSWORD.
 * Without those set, this falls back to logging the code to the
 * server console, so local development keeps working without every
 * contributor needing a Gmail app password of their own.
 */
export async function sendOtpEmail(email: string, code: string): Promise<void> {
  if (!transporter) {
    console.log(
      `\n📧 [DEV EMAIL — GMAIL_USER/GMAIL_APP_PASSWORD not set] OTP for ${email}: ${code} (expires in 10 minutes)\n`
    );
    return;
  }

  try {
    await transporter.sendMail({
      from: FROM_ADDRESS,
      to: email,
      subject: `${code} is your verification code`,
      html: otpEmailHtml(code),
      text: `Your verification code is ${code}. It expires in 10 minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
    });
  } catch (err) {
    throw new MailerError(err instanceof Error ? err.message : "Failed to send email.");
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
