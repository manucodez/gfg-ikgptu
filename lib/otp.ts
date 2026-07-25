import crypto from "crypto";

/** Generates a 6-digit numeric code as a zero-padded string. */
export function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function otpExpiryDate(minutesFromNow = 10): string {
  return new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString();
}

export function isOtpExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

export const MAX_OTP_ATTEMPTS = 5;
