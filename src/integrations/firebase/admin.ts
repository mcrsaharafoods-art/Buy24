import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import fs from "fs";
import path from "path";

if (!getApps().length) {
  let credential;

  try {
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      credential = cert({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      });
      console.log("Initialized Firebase Admin using individual env vars.");
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = cert(serviceAccount);
      console.log("Initialized Firebase Admin using FIREBASE_SERVICE_ACCOUNT env var.");
    } else {
      const localCertPath = path.resolve(process.cwd(), "firebase-service-account.json");
      if (fs.existsSync(localCertPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(localCertPath, "utf-8"));
        credential = cert(serviceAccount);
        console.log("Initialized Firebase Admin using local service account JSON.");
      } else {
        console.warn(
          "WARNING: No Firebase Admin credentials found! Falling back to applicationDefault().",
        );
        credential = applicationDefault();
      }
    }
  } catch (error) {
    console.error("Error loading Firebase credentials:", error);
    credential = applicationDefault();
  }

  if (!process.env.VITE_FIREBASE_PROJECT_ID) {
    throw new Error(
      "FIREBASE ADMIN INIT ERROR: VITE_FIREBASE_PROJECT_ID is missing from environment variables.",
    );
  }

  initializeApp({
    credential,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  });
}

if (!getApps().length) {
  throw new Error("FIREBASE ADMIN INIT ERROR: Firebase Admin SDK failed to initialize.");
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
export const adminStorage = getStorage();
