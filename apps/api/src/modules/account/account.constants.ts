import type { CookieOptions } from "express";

// Customer sessions are separate from the dashboard's (PRD §5.10): their own
// refresh cookie, only ever sent to the customer auth routes. A browser can be
// signed in to both at once without one replacing the other.

export const CUSTOMER_REFRESH_COOKIE = "aar_crt";
export const CUSTOMER_REFRESH_COOKIE_PATH = "/api/v1/account/auth";

/** Google sign-in: state + PKCE verifier + where to go next, for 10 minutes. */
export const GOOGLE_STATE_COOKIE = "aar_gs";
export const GOOGLE_STATE_COOKIE_PATH = "/api/v1/account/auth/google";
export const GOOGLE_STATE_TTL_MS = 10 * 60_000;

export function customerCookieOptions(
  production: boolean,
  path: string,
  maxAgeMs?: number,
): CookieOptions {
  return {
    httpOnly: true,
    secure: production,
    // Lax: the Google callback is a top-level GET navigation, which carries it.
    sameSite: "lax",
    path,
    ...(maxAgeMs !== undefined && { maxAge: maxAgeMs }),
  };
}

/** How long emailed links work. */
export const VERIFY_EMAIL_TTL_MS = 3 * 24 * 3_600_000;
export const RESET_PASSWORD_TTL_MS = 30 * 60_000;
