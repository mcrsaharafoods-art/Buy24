import { initializeApp, getApps, getApp } from "firebase/app";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Defensive check to ensure API key is valid and not wrapped in literal quotes
if (typeof window !== "undefined") {
  if (!firebaseConfig.apiKey) {
    throw new Error(
      "FIREBASE INITIALIZATION FAILED: VITE_FIREBASE_API_KEY is missing from environment variables.",
    );
  }
  if (firebaseConfig.apiKey.startsWith('"') || firebaseConfig.apiKey.endsWith('"')) {
    throw new Error(
      "FIREBASE INITIALIZATION FAILED: VITE_FIREBASE_API_KEY contains literal quotes. Please remove the quotes in your .env file.",
    );
  }
}

// Prevent Firebase initialization on the server-side during SSR
export const app =
  typeof window !== "undefined"
    ? !getApps().length
      ? initializeApp(firebaseConfig)
      : getApp()
    : (null as any);
