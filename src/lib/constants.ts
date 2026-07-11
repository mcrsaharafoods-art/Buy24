/**
 * Buy24Us shared constants.
 */
export const APP_NAME = "Buy24Us";

/**
 * Initial password for the super admin account.
 * The admin user is bootstrapped on first admin sign-in.
 * Change here to rotate; no other admins exist.
 */
export const ADMIN_EMAIL = "admin@buy24us.app";
export const ADMIN_PASSWORD = "Buy24Us@Admin#2026";

/**
 * Vendor accounts do not need a real email. When the vendor omits email
 * we synthesize one from the verified mobile number so Supabase Auth has
 * a unique identifier. Vendors sign in with the same mobile + password.
 */
export const VENDOR_EMAIL_DOMAIN = "vendor.buy24us.app";
export function mobileToVendorEmail(mobile: string): string {
  return `m${mobile.replace(/\D/g, "")}@${VENDOR_EMAIL_DOMAIN}`;
}

/** Document upload limits. */
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_DOCUMENT_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const MAX_FAVICON_BYTES = 200 * 1024; // 200 KB
export const ALLOWED_FAVICON_MIME = [
  "image/png",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "image/svg+xml",
  "image/webp",
] as const;

export const DOCUMENT_LABELS: Record<string, string> = {
  aadhaar: "Aadhaar",
  pan: "PAN",
  shop_photo: "Shop Photo",
  shop_license: "Shop License",
  cancelled_cheque: "Cancelled Cheque / Passbook",
};

export const REQUIRED_DOCUMENTS = ["aadhaar", "pan", "shop_photo", "cancelled_cheque"] as const;

export const OPTIONAL_DOCUMENTS = ["shop_license"] as const;

export const ALL_DOCUMENTS = [...REQUIRED_DOCUMENTS, ...OPTIONAL_DOCUMENTS] as const;

export const SELLER_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "proprietorship", label: "Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "private_limited", label: "Private Limited" },
  { value: "llp", label: "LLP" },
] as const;
