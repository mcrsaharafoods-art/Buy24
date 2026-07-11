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
    const code = await generateOtp(data.mobile);
    await sendOtpMessage(data.mobile, code);

    return {
      success: true,
      ...(isDev ? { devOtp: code, devCode: code } : {}),
      message: isDev
        ? "OTP generated (dev mode — displayed on screen)"
        : "OTP sent to your mobile",
    };
  });

export const verifyOtp = createServerFn({ method: "POST" })
  .validator((input: { mobile: string; code: string }) =>
    z.object({ mobile: mobileSchema, code: otpSchema }).parse(input),
  )
  .handler(async ({ data }) => {
    await verifyOtpService(data.mobile, data.code);
    return { success: true };
  });
