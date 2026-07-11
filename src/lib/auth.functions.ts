import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { setCookie, deleteCookie } from "@tanstack/react-start/server";

export const createSession = createServerFn({ method: "POST" })
  .validator((input: { idToken: string }) => z.object({ idToken: z.string() }).parse(input))
  .handler(async ({ data }) => {
    try {
      console.log("createSession called with idToken:", data.idToken.substring(0, 20) + "...");
      setCookie("auth_token", data.idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 14,
        path: "/",
        sameSite: "lax",
      });
      return { success: true };
    } catch (e: any) {
      console.error("SERVER ERROR IN createSession:", e);
      console.error(e.stack);
      throw e;
    }
  });

export const removeSession = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie("auth_token", { path: "/" });
  return { success: true };
});
