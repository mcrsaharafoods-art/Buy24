import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { setCookie, deleteCookie } from "@tanstack/react-start/server";

export const createSession = createServerFn({ method: "POST" })
  .validator((input: { idToken: string }) => z.object({ idToken: z.string() }).parse(input))
  .handler(async ({ data }) => {
    try {
      console.log("[AUTH] createSession START");
      console.log("[AUTH] Received idToken");
      
      console.log("[AUTH] setCookie START");
      setCookie("auth_token", data.idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 14,
        path: "/",
        sameSite: "lax",
      });
      console.log("[AUTH] setCookie SUCCESS");
      
      console.log("[AUTH] RETURN SUCCESS");
      return { success: true };
    } catch (error: any) {
      console.error("FUNCTION: createSession");
      console.error("MESSAGE:", error?.message);
      console.error("STACK:", error?.stack);
      throw error;
    }
  });

export const removeSession = createServerFn({ method: "POST" }).handler(async () => {
  try {
    console.log("[AUTH] removeSession START");
    deleteCookie("auth_token", { path: "/" });
    console.log("[AUTH] removeSession SUCCESS");
    return { success: true };
  } catch (error: any) {
    console.error("FUNCTION: removeSession");
    console.error("MESSAGE:", error?.message);
    console.error("STACK:", error?.stack);
    throw error;
  }
});
