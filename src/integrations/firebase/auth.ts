import { getAuth } from "firebase/auth";
import { app } from "./config";

// Prevent Firebase Auth initialization on the server-side during SSR
export const auth = typeof window !== "undefined" ? getAuth(app) : (null as any);
