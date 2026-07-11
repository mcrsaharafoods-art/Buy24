import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import fs from "fs";
import path from "path";

console.log("[SERVER] Initializing Firebase Admin...");

let adminAuth: any = null;
let adminDb: any = null;
let adminStorage: any = null;

if (!getApps().length) {
  let credential = null;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log("[SERVER] Using FIREBASE_SERVICE_ACCOUNT env var.");
      credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
    } else {
      const localCertPath = path.resolve(process.cwd(), "firebase-service-account.json");
      if (fs.existsSync(localCertPath)) {
        console.log("[SERVER] Using local firebase-service-account.json");
        credential = cert(JSON.parse(fs.readFileSync(localCertPath, "utf-8")));
      } else if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ) {
        console.log("[SERVER] Using individual FIREBASE_ env vars.");
        credential = cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        });
      }
    }

    if (credential) {
      initializeApp({
        credential,
        projectId: projectId,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
      });
      console.log("[SERVER] Firebase Admin initialized successfully.");
    } else {
      console.warn("[SERVER] WARNING: No Firebase Admin credentials found! Exporting services as null.");
    }
  } catch (error: any) {
    console.error("[SERVER] Firebase Admin initialization threw an error:", error.message);
    console.warn("[SERVER] WARNING: Exporting services as null due to initialization error.");
  }
}

if (getApps().length > 0) {
  adminAuth = getAuth();
  adminDb = getFirestore();
  adminStorage = getStorage();
}

export { adminAuth, adminDb, adminStorage };