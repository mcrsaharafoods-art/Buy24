import { createMiddleware } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { adminAuth } from "@/integrations/firebase/admin";

export const requireAuth = createMiddleware().server(async ({ next }) => {
  try {
    console.log("[MIDDLEWARE] Request received");
    
    if (!adminAuth || !adminDb) {
      throw new Error("Firebase Admin SDK not initialized.");
    }

    const token = getCookie("auth_token");
    if (!token) {
      console.log("[MIDDLEWARE] Cookie missing");
      throw new Error("Unauthorized: No token provided");
    }
    console.log("[MIDDLEWARE] Cookie found");

    let decodedToken;
    try {
      console.log("[MIDDLEWARE] verifySessionCookie START");
      decodedToken = await adminAuth.verifyIdToken(token);
      console.log("[MIDDLEWARE] verifySessionCookie SUCCESS");
    } catch (tokenError: any) {
      console.log("[MIDDLEWARE] verifySessionCookie FAILED");
      throw new Error(`Unauthorized: Invalid token - ${tokenError.message}`);
    }

    let user;
    try {
      console.log("[MIDDLEWARE] Fetching user from Firebase Admin...");
      user = await adminAuth.getUser(decodedToken.uid);
      console.log("[MIDDLEWARE] Successfully fetched user.");
    } catch (userError: any) {
      throw new Error(`Unauthorized: User fetch failed - ${userError.message}`);
    }

    return next({ context: { user, userId: user.uid } });
  } catch (error: any) {
    console.error("FUNCTION: requireAuth");
    console.error("MESSAGE:", error?.message);
    console.error("STACK:", error?.stack);
    throw error;
  }
});
