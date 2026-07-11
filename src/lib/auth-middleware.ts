import { createMiddleware } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { adminAuth } from "@/integrations/firebase/admin";

export const requireAuth = createMiddleware().server(async ({ next }) => {
  try {
    console.log("[SERVER] auth-middleware executing requireAuth...");
    
    if (!adminAuth || !adminDb) {
      throw new Error("Firebase Admin SDK not initialized.");
    }

    const token = getCookie("auth_token");
    if (!token) {
      console.warn("[SERVER] Unauthorized: No token provided in cookies.");
      throw new Error("Unauthorized: No token provided");
    }

    let decodedToken;
    try {
      console.log("[SERVER] Calling verifyIdToken...");
      decodedToken = await adminAuth.verifyIdToken(token);
      console.log(`[SERVER] verifyIdToken success for UID: ${decodedToken.uid}`);
    } catch (tokenError: any) {
      console.error(`[SERVER] Token verification failed: ${tokenError.message}`);
      throw new Error(`Unauthorized: Invalid token - ${tokenError.message}`);
    }

    let user;
    try {
      console.log("[SERVER] Fetching user from Firebase Admin...");
      user = await adminAuth.getUser(decodedToken.uid);
      console.log("[SERVER] Successfully fetched user.");
    } catch (userError: any) {
      console.error(`[SERVER] Failed to fetch user data: ${userError.message}`);
      throw new Error(`Unauthorized: User fetch failed - ${userError.message}`);
    }

    console.log("[SERVER] Middleware context set successfully. Proceeding to next()...");
    return next({ context: { user, userId: user.uid } });
  } catch (e: any) {
    console.error("[SERVER] FATAL ERROR IN MIDDLEWARE");
    console.error(`[SERVER] error.message: ${e.message}`);
    console.error(`[SERVER] error.stack: ${e.stack}`);
    console.error(`[SERVER] request path: middleware`);
    console.error(`[SERVER] function name: requireAuth`);
    throw e;
  }
});
