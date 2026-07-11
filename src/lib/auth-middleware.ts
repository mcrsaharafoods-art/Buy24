import { createMiddleware } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { adminAuth } from "@/integrations/firebase/admin";

export const requireAuth = createMiddleware().server(async ({ next }) => {
  try {
    console.log("[auth-middleware] Executing requireAuth middleware...");
    const token = getCookie("auth_token");
    if (!token) {
      console.warn("[auth-middleware] Unauthorized: No token provided in cookies.");
      throw new Error("Unauthorized: No token provided");
    }

    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
      console.log("[auth-middleware] Token successfully verified for UID:", decodedToken.uid);
    } catch (tokenError: any) {
      console.error("[auth-middleware] Token verification failed:", tokenError.message);
      throw new Error(`Unauthorized: Invalid token - ${tokenError.message}`);
    }

    let user;
    try {
      user = await adminAuth.getUser(decodedToken.uid);
      console.log("[auth-middleware] Successfully fetched user from Firebase Admin.");
    } catch (userError: any) {
      console.error("[auth-middleware] Failed to fetch user data:", userError.message);
      throw new Error(`Unauthorized: User fetch failed - ${userError.message}`);
    }

    return next({ context: { user, userId: user.uid } });
  } catch (e: any) {
    console.error("[auth-middleware] FATAL ERROR IN MIDDLEWARE:", e);
    console.error("[auth-middleware] Stack trace:", e.stack);
    throw e;
  }
});
