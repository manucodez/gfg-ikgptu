/**
 * Single swap point for sending real email. Right now this just logs
 * to the server console — there's no email provider configured, so
 * this is the only way to "deliver" an OTP without one. Replace the
 * body of sendOtpEmail with a real provider (Resend, Nodemailer +
 * SMTP, SendGrid...) when you're ready to go live — see BACKEND.md.
 *
 * Intentionally NOT returned in any API response: even for local
 * testing, printing the code to the server terminal (which only
 * whoever is running `npm run dev`/`npm start` can see) is safer
 * than putting it somewhere a browser network tab could catch it.
 */
export async function sendOtpEmail(email: string, code: string): Promise<void> {
  console.log(
    `\n📧 [DEV EMAIL — no provider configured] OTP for ${email}: ${code} (expires in 10 minutes)\n`
  );
}
