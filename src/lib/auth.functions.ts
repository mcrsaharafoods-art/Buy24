import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { setCookie, deleteCookie } from "@tanstack/react-start/server";

export const createSession = createServerFn({ method: "POST" })
  .validator((input: { idToken: string }) => z.object({ idToken: z.string() }).parse(input))
  .handler(async ({ data }) => {
    try {
      console.log(`[SERVER] createSession started`);
      console.log(`[SERVER] Received idToken: ${data.idToken.substring(0, 15)}...`);
      
      console.log("[SERVER] Calling setCookie...");
      setCookie("auth_token", data.idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 14,
        path: "/",
        sameSite: "lax",
      });
      console.log("[SERVER] session cookie created");
      console.log("[SERVER] cookie written");
      
      return { success: true };
    } catch (e: any) {
      console.error("[SERVER] BOOTSTRAP ERROR THROWN ON SERVER");
      console.error(`[SERVER] error.message: ${e.message}`);
      console.error(`[SERVER] error.stack: ${e.stack}`);
      console.error(`[SERVER] function name: createSession`);
      throw new Error(`[createSession] Failed: ${e.message}`);
    }
  });

export const removeSession = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie("auth_token", { path: "/" });
  return { success: true };
});
