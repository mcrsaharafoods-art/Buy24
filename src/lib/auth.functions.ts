import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { setCookie, deleteCookie } from "@tanstack/react-start/server";

export const createSession = createServerFn({ method: "POST" })
  .validator((input: { idToken: string }) => z.object({ idToken: z.string() }).parse(input))
  .handler(async ({ data }) => {
    try {
      console.log("[createSession] Request received for idToken:", data.idToken.substring(0, 15) + "...");
      console.log("[createSession] Calling setCookie...");
      setCookie("auth_token", data.idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 14,
        path: "/",
        sameSite: "lax",
      });
      console.log("[createSession] Cookie created successfully.");
      return { success: true };
    } catch (e: any) {
      console.error("[createSession] SERVER ERROR IN createSession:", e);
      console.error("[createSession] Stack trace:", e.stack);
      throw new Error(`[createSession] Failed: ${e.message}`);
    }
  });

export const removeSession = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie("auth_token", { path: "/" });
  return { success: true };
});
