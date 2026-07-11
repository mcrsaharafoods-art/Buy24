/**
 * DEVELOPMENT OTP SERVICE
 */
import { adminDb, adminAuth } from "@/integrations/firebase/admin";
import { COLLECTIONS } from "@/integrations/firebase/firestore";

export async function sendOtpMessage(mobile: string, code: string): Promise<void> {
  // Mock SMS dispatch
  console.log(`[Mock SMS] Sending ${code} to ${mobile}`);
}

export async function generateOtp(mobile: string): Promise<string> {
  if (!adminAuth || !adminDb) {
    throw new Error("Firebase Admin SDK not initialized.");
  }
  const code = "123456";
  await adminDb.collection(COLLECTIONS.OTP_VERIFICATIONS).doc(mobile).set({
    id: mobile,
    mobile,
    code,
    verified: false,
    created_at: new Date().toISOString(),
  });
  return code;
}

export async function verifyOtp(mobile: string, code: string): Promise<void> {
  if (!adminAuth || !adminDb) {
    throw new Error("Firebase Admin SDK not initialized.");
  }
  const snap = await adminDb.collection(COLLECTIONS.OTP_VERIFICATIONS).doc(mobile).get();
  if (!snap.exists || snap.data()?.code !== code) {
    throw new Error("Invalid OTP");
  }
  await snap.ref.update({ verified: true });
}

export async function cleanupExpiredOtps(): Promise<void> {
  // Not implemented for mock
}

export async function resendOtp(mobile: string): Promise<string> {
  return generateOtp(mobile);
}
