import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import fs from "fs";
import path from "path";

console.log("[FIREBASE] Module init START");

console.log("[FIREBASE] process.env.FIREBASE_PROJECT_ID exists?", !!process.env.FIREBASE_PROJECT_ID);
console.log("[FIREBASE] process.env.FIREBASE_CLIENT_EMAIL exists?", !!process.env.FIREBASE_CLIENT_EMAIL);
console.log("[FIREBASE] process.env.FIREBASE_PRIVATE_KEY exists?", !!process.env.FIREBASE_PRIVATE_KEY);
console.log("[FIREBASE] process.env.FIREBASE_STORAGE_BUCKET exists?", !!process.env.FIREBASE_STORAGE_BUCKET);
console.log("[FIREBASE] process.env.VITE_FIREBASE_PROJECT_ID exists?", !!process.env.VITE_FIREBASE_PROJECT_ID);

let adminAuth: any = null;
let adminDb: any = null;
let adminStorage: any = null;
let adminInitializationError: Error | null = null;

function normalizePrivateKey(value: string) {
  return value
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n");
}

if (!getApps().length) {
  console.log("[FIREBASE] No apps found. Initializing...");
  let credential = null;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.VITE_FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.VITE_FIREBASE_PRIVATE_KEY;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log("[FIREBASE] Using FIREBASE_SERVICE_ACCOUNT env var.");
      credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
    } else {
      const localCertPath = path.resolve(process.cwd(), "firebase-service-account.json");
      if (fs.existsSync(localCertPath)) {
        console.log("[FIREBASE] Using local firebase-service-account.json");
        credential = cert(JSON.parse(fs.readFileSync(localCertPath, "utf-8")));
      } else if (projectId && clientEmail && privateKey) {
        console.log("[FIREBASE] Using individual FIREBASE_ env vars.");
        credential = cert({
          projectId,
          clientEmail,
          privateKey: normalizePrivateKey(privateKey),
        });
      }
    }

    if (credential) {
      console.log("[FIREBASE] initializeApp START");
      initializeApp({
        credential,
        projectId: projectId,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
      });
      console.log("[FIREBASE] initializeApp SUCCESS");
    } else {
      adminInitializationError = new Error(
        "Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY.",
      );
      console.error("[FIREBASE]", adminInitializationError.message);
    }
  } catch (error: any) {
    adminInitializationError =
      error instanceof Error ? error : new Error(String(error));
    console.error("[FIREBASE] initializeApp threw an error:", error.message);
    console.warn("[FIREBASE] WARNING: Exporting services as null due to initialization error.");
  }
} else {
  console.log("[FIREBASE] App already initialized. Skipping initializeApp.");
}

if (getApps().length > 0) {
  console.log("[FIREBASE] Assigning services START");
  adminAuth = getAuth();
  adminDb = getFirestore();
  adminStorage = getStorage();
  console.log("[FIREBASE] Assigning services SUCCESS");
} else {
  console.log("[FIREBASE] No apps exist. Services remain null.");
}

console.log("[FIREBASE] adminAuth is null?", adminAuth === null);
console.log("[FIREBASE] adminDb is null?", adminDb === null);
console.log("[FIREBASE] adminStorage is null?", adminStorage === null);
console.log("[FIREBASE] Module init END");

export { adminAuth, adminDb, adminStorage, adminInitializationError };
