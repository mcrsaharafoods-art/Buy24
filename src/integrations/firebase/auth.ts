import { getAuth } from "firebase/auth";
import { app } from "./config";

if (typeof window !== "undefined" && !app) {
  throw new Error(
    "FIREBASE INIT ERROR: 'app' is undefined. Ensure config.ts initializes Firebase before auth.ts is loaded.",
  );
}

// Prevent Firebase Auth initialization on the server-side during SSR
export const auth = typeof window !== "undefined" ? getAuth(app) : (null as any);
