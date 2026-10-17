import type { CookieOptions } from "express";

/** The refresh-token cookie (httpOnly; JS never sees it). */
export const REFRESH_COOKIE = "aar_rt";

/** Only sent to the auth routes, never to the rest of the API or site. */
export const REFRESH_COOKIE_PATH = "/api/v1/auth";

export function refreshCookieOptions(
  production: boolean,
  maxAgeMs?: number,
): CookieOptions {
  return {
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    path: REFRESH_COOKIE_PATH,
    ...(maxAgeMs !== undefined && { maxAge: maxAgeMs }),
  };
}

/** A replaced refresh token is still accepted this long, so two tabs
 *  refreshing at the same moment do not look like token theft. */
export const REFRESH_REUSE_GRACE_MS = 10_000;

export const JWT_ISSUER = "aaarchive-api";
export const JWT_AUDIENCE = "aaarchive";
