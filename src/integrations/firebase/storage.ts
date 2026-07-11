import { getStorage } from "firebase/storage";
import { app } from "./config";

// Prevent Firebase Storage initialization on the server-side during SSR
export const storage = typeof window !== "undefined" ? getStorage(app) : (null as any);
