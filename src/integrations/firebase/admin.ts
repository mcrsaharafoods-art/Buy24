import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import fs from "fs";
import path from "path";

if (!getApps().length) {
  let credential;

  try {
    const localCertPath = path.resolve(process.cwd(), "firebase-service-account.json");
    if (fs.existsSync(localCertPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(localCertPath, "utf-8"));
      credential = cert(serviceAccount);
      console.log("Initialized Firebase Admin using local service account JSON.");
    } else {
      credential = applicationDefault();
      console.log("Initialized Firebase Admin using applicationDefault().");
    }
  } catch (error) {
    console.error("Error loading Firebase credentials, falling back to applicationDefault():", error);
    credential = applicationDefault();
  }

  initializeApp({
    credential,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
export const adminStorage = getStorage();
