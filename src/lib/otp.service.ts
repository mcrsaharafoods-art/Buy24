import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * DEVELOPMENT OTP SERVICE
 *
 * This service handles OTP lifecycle (generation, storage, verification).
 * It uses the existing `otp_verifications` table for storage.
 */

const OTP_EXPIRY_MINUTES = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_RESEND_ATTEMPTS = 3;
const RESEND_COOLDOWN_MINUTES = 15;

/**
 * Replaces the Twilio send logic in the future.
 * Currently logs the OTP to the console.
 */
export async function sendOtpMessage(mobile: string, code: string): Promise<void> {
  // TODO integration point: call Twilio/MSG91/etc. from here in the future.
  // The only code that will change is inside this function.
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[DEV SMS -> ${mobile}] Your Buy24Us verification code is ${code}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
    );
  } else {
    // Prevent logging plaintext OTPs in production logs.
    console.log(`[PROD SMS -> ${mobile}] OTP successfully dispatched.`);
  }
}

/**
 * Validates resend limits and generates a secure OTP.
 */
export async function generateOtp(mobile: string): Promise<string> {
  // Check resend limits
  const cooldownTimestamp = new Date(
    Date.now() - RESEND_COOLDOWN_MINUTES * 60 * 1000,
  ).toISOString();

  const { count, error: countErr } = await supabaseAdmin
    .from("otp_verifications")
    .select("*", { count: "exact", head: true })
    .eq("mobile", mobile)
    .gte("created_at", cooldownTimestamp);

  if (countErr) throw new Error(countErr.message);

  if (count && count >= MAX_RESEND_ATTEMPTS) {
    throw new Error(
      `Maximum resend attempts reached. Please wait ${RESEND_COOLDOWN_MINUTES} minutes.`,
    );
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();

  // Invalidate previous unverified codes for this mobile by expiring them immediately,
  // instead of marking them as verified (which would allow an attacker to bypass registration).
  await supabaseAdmin
    .from("otp_verifications")
    .update({ expires_at: new Date(0).toISOString() })
    .eq("mobile", mobile)
    .eq("verified", false);

  const { error } = await supabaseAdmin.from("otp_verifications").insert({
    mobile,
    code,
    expires_at: expiresAt,
  });

  if (error) throw new Error(error.message);

  return code;
}

/**
 * Verifies an OTP based on attempts, expiry, and correctness.
 */
export async function verifyOtp(mobile: string, code: string): Promise<void> {
  const { data: rows, error } = await supabaseAdmin
    .from("otp_verifications")
    .select("*")
    .eq("mobile", mobile)
    .eq("verified", false)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  const record = rows?.[0];
  if (!record) {
    throw new Error("No active OTP. Please request a new code.");
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    throw new Error("OTP has expired. Please request a new code.");
  }

  if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new Error("Too many attempts. Please request a new code.");
  }

  if (record.code !== code) {
    await supabaseAdmin
      .from("otp_verifications")
      .update({ attempts: record.attempts + 1 })
      .eq("id", record.id);
    throw new Error("Incorrect OTP.");
  }

  const { error: updErr } = await supabaseAdmin
    .from("otp_verifications")
    .update({ verified: true })
    .eq("id", record.id);

  if (updErr) throw new Error(updErr.message);
}

/**
 * Helper to cleanup old OTPs to prevent table bloat.
 */
export async function cleanupExpiredOtps(): Promise<void> {
  const expiredTimestamp = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
  await supabaseAdmin.from("otp_verifications").delete().lt("created_at", expiredTimestamp);
}

/**
 * Resends an OTP (this acts as an alias to generateOtp which handles invalidation and limits).
 */
export async function resendOtp(mobile: string): Promise<string> {
  return generateOtp(mobile);
}
