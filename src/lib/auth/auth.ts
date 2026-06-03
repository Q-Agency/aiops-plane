import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { z } from "zod";

import type { AppUser } from "./types";
import { findUserByEmail, verifyCredentials } from "./users.server";

// Prototype session: an httpOnly cookie carrying the user's email. It is NOT
// signed — acceptable while everything is mock/hardcoded, but must be replaced
// with a signed/sealed session (or a real IdP) before live data is connected.
const SESSION_COOKIE = "aiops_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

type LoginResult = { ok: true; user: AppUser } | { ok: false; error: string };

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().min(1),
      password: z.string().min(1),
    }),
  )
  .handler(async ({ data }): Promise<LoginResult> => {
    const user = verifyCredentials(data.email, data.password);
    if (!user) {
      return { ok: false, error: "Invalid email or password." };
    }

    setCookie(SESSION_COOKIE, user.email, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      // The rig serves over plain HTTP (port 8555), so `secure` must stay off
      // or the browser drops the cookie. Set to true once behind HTTPS.
      secure: false,
      maxAge: MAX_AGE_SECONDS,
    });

    return { ok: true, user };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(SESSION_COOKIE, { path: "/" });
  return { ok: true };
});

export const fetchUser = createServerFn({ method: "GET" }).handler(
  async (): Promise<AppUser | null> => {
    const email = getCookie(SESSION_COOKIE);
    if (!email) return null;
    // Resolve against the known user list so identity/dataMode is derived
    // server-side, not trusted from the cookie beyond the email.
    return findUserByEmail(email);
  },
);
