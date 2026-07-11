import { createMiddleware } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { adminAuth } from "@/integrations/firebase/admin";

export const requireAuth = createMiddleware().server(async ({ next }) => {
  const token = getCookie("auth_token");
  if (!token) {
    throw new Error("Unauthorized: No token provided");
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const user = await adminAuth.getUser(decodedToken.uid);
    return next({ context: { user, userId: user.uid } });
  } catch (error) {
    throw new Error("Unauthorized: Invalid token");
  }
});
