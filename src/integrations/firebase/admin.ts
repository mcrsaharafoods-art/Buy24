import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import fs from "fs";
import path from "path";

console.log("[FIREBASE ADMIN] Initializing...");
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || (typeof import.meta.env !== "undefined" ? import.meta.env.VITE_FIREBASE_PROJECT_ID : undefined);
const storageBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET || (typeof import.meta.env !== "undefined" ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET : undefined);

console.log(`[FIREBASE ADMIN] Project ID: ${projectId}`);

if (!getApps().length) {
  let credential;

  try {
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      console.log("[FIREBASE ADMIN] Using individual env vars for credentials.");
      credential = cert({
        projectId: projectId,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      });
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log("[FIREBASE ADMIN] Using FIREBASE_SERVICE_ACCOUNT env var.");
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = cert(serviceAccount);
    } else {
      console.log("[FIREBASE ADMIN] Attempting to load local firebase-service-account.json");
      const localCertPath = path.resolve(process.cwd(), "firebase-service-account.json");
      if (fs.existsSync(localCertPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(localCertPath, "utf-8"));
        credential = cert(serviceAccount);
        console.log("[FIREBASE ADMIN] Loaded local service account JSON.");
      } else {
        console.warn("[FIREBASE ADMIN] WARNING: No explicit credentials found! Falling back to applicationDefault().");
        credential = applicationDefault();
      }
    }
  } catch (error: any) {
    console.error("[FIREBASE ADMIN] Error loading credentials:", error);
    console.error("[FIREBASE ADMIN] Stack trace:", error.stack);
    // Fall back to applicationDefault instead of crashing the whole module on import
    credential = applicationDefault();
  }

  try {
    console.log("[FIREBASE ADMIN] Calling initializeApp...");
    initializeApp({
      credential,
      projectId: projectId,
      storageBucket: storageBucket,
    });
    console.log("[FIREBASE ADMIN] Successfully initialized.");
  } catch (error: any) {
    console.error("[FIREBASE ADMIN] initializeApp threw an error:", error);
    console.error("[FIREBASE ADMIN] Stack trace:", error.stack);
  }
}

let adminAuth: any, adminDb: any, adminStorage: any;
try {
  adminAuth = getAuth();
  adminDb = getFirestore();
  adminStorage = getStorage();
} catch (error: any) {
  console.error("[FIREBASE ADMIN] Error getting services:", error);
}

export { adminAuth, adminDb, adminStorage };
