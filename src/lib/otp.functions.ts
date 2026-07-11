import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { mobileSchema, otpSchema } from "./validation";
import { generateOtp, sendOtpMessage, verifyOtp as verifyOtpService } from "./otp.service";

const isDevMode = () => process.env.NODE_ENV === "development";

// DEVELOPMENT ONLY
// Replace with Twilio implementation after client provides credentials.
export const sendOtp = createServerFn({ method: "POST" })
  .validator((input: { mobile: string }) => z.object({ mobile: mobileSchema }).parse(input))
  .handler(async ({ data }) => {
    const isDev = isDevMode();
    if (isDev) {
      // DEVELOPMENT ONLY: Temporary fallback for missing Twilio / Firebase keys
      return {
        success: true,
        devOtp: "123456", // Padded to 6 digits to pass UI length validation
        devCode: "123456",
        message: "OTP generated (dev mode — displayed on screen)",
      };
    }

    const code = await generateOtp(data.mobile);
    await sendOtpMessage(data.mobile, code);

    return {
      success: true,
      message: "OTP sent to your mobile",
    };
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .validator((input: { mobile: string; code: string }) =>
    z.object({ mobile: mobileSchema, code: otpSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    if (isDevMode()) {
      // DEVELOPMENT ONLY: Temporary fallback
      if (data.code === "123456" || data.code === "12345") {
        return { success: true };
      }
      throw new Error("Incorrect OTP.");
    }

    await verifyOtpService(data.mobile, data.code);
    return { success: true };
  });
