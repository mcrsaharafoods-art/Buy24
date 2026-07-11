import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { setCookie, deleteCookie } from "vinxi/http";

export const createSession = createServerFn({ method: "POST" })
  .validator((input: { idToken: string }) => z.object({ idToken: z.string() }).parse(input))
  .handler(async ({ data }) => {
    // We set the cookie for 14 days
    setCookie("auth_token", data.idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 14,
      path: "/",
      sameSite: "lax",
    });
    return { success: true };
  });

export const removeSession = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie("auth_token", { path: "/" });
  return { success: true };
});
