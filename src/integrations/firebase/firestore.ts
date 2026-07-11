import { getFirestore } from "firebase/firestore";
import { app } from "./config";

// Prevent Firebase Firestore initialization on the server-side during SSR
export const db = typeof window !== "undefined" ? getFirestore(app) : (null as any);

// Collection Names Enums
export const COLLECTIONS = {
  USERS: "users",
  VENDORS: "vendors",
  VENDOR_APPLICATIONS: "vendorApplications",
  APPLICATION_DOCUMENTS: "applicationDocuments",
  PRODUCTS: "products",
  CATEGORIES: "categories",
  ORDERS: "orders",
  SETTINGS: "settings",
  NOTIFICATIONS: "notifications",
  ANALYTICS: "analytics",
  OTP_VERIFICATIONS: "otpVerifications",
} as const;
