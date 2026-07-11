import { z } from "zod";

/**
 * Shared Zod validators. Reused across UI forms and server-fn input validators
 * so both edges apply the same rules.
 */

export const mobileSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(255);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/\d/, "Include a number");

export const otpSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "OTP must be 6 digits");

export const gstSchema = z
  .string()
  .trim()
  .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}Z[A-Z\d]{1}$/, "Enter a valid 15-character GSTIN");

export const fssaiSchema = z
  .string()
  .trim()
  .regex(/^\d{14}$/, "FSSAI number must be 14 digits");

export const ifscSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC code");

export const pincodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Pincode must be 6 digits");

export const accountNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{9,18}$/, "Account number must be 9-18 digits");

export const upiIdSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/, "Enter a valid UPI ID");

export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter time as HH:MM");

/** Full application submission payload validator. */
export const submitApplicationSchema = z.object({
  // Step 1
  full_name: z.string().trim().min(2).max(100),
  mobile: mobileSchema,
  email: emailSchema
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  password: passwordSchema,
  otp: otpSchema,
  // Step 2
  shop_name: z.string().trim().min(2).max(150),
  seller_type: z.enum(["individual", "proprietorship", "partnership", "private_limited", "llp"]),
  gst_number: gstSchema
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  fssai_number: fssaiSchema
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  // Step 3
  state: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  pincode: pincodeSchema,
  address_line: z.string().trim().max(300).optional(),
  latitude: z.number().gte(-90).lte(90).optional(),
  longitude: z.number().gte(-180).lte(180).optional(),
  // Step 4
  account_holder_name: z.string().trim().min(2).max(100),
  bank_name: z.string().trim().min(2).max(100),
  account_number: accountNumberSchema,
  ifsc: ifscSchema,
  upi_id: upiIdSchema
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  // Step 5 — documents come in as {docType: {name, mime, base64}}
  documents: z.record(
    z.enum(["aadhaar", "pan", "shop_photo", "shop_license", "cancelled_cheque"]),
    z.object({
      file_name: z.string().min(1).max(255),
      mime_type: z.string().min(1).max(100),
      base64: z.string().min(1),
    }),
  ),
  // Step 6
  delivery_radius_km: z.number().int().min(1).max(200),
  opening_time: timeSchema,
  closing_time: timeSchema,
  home_delivery: z.boolean(),
  pickup_available: z.boolean(),
  // Step 7
  terms_accepted: z.literal(true),
});

export type SubmitApplicationInput = z.infer<typeof submitApplicationSchema>;
