import type { Response } from "express";
import type { IssuedRefresh } from "../auth/token.service.js";
import {
  CUSTOMER_REFRESH_COOKIE,
  CUSTOMER_REFRESH_COOKIE_PATH,
  customerCookieOptions,
} from "./account.constants.js";

/**
 * Not secret: tells the shop's pages that a customer session probably exists,
 * so guests are not sent on a refresh round-trip. Mirrors the web's
 * lib/account/account-hint.ts.
 */
export const CUSTOMER_HINT_COOKIE = "aar_csession";

export function setCustomerSession(
  res: Response,
  refresh: IssuedRefresh,
  production: boolean,
) {
  res.cookie(
    CUSTOMER_REFRESH_COOKIE,
    refresh.token,
    customerCookieOptions(
      production,
      CUSTOMER_REFRESH_COOKIE_PATH,
      refresh.maxAgeMs,
    ),
  );
  res.cookie(CUSTOMER_HINT_COOKIE, "1", {
    httpOnly: false,
    secure: production,
    sameSite: "lax",
    path: "/",
    maxAge: refresh.maxAgeMs,
  });
}

export function clearCustomerSession(res: Response, production: boolean) {
  res.clearCookie(
    CUSTOMER_REFRESH_COOKIE,
    customerCookieOptions(production, CUSTOMER_REFRESH_COOKIE_PATH),
  );
  res.clearCookie(CUSTOMER_HINT_COOKIE, {
    secure: production,
    sameSite: "lax",
    path: "/",
  });
}

/** Where to land after Google sign-in: only our own account or checkout pages. */
export function safeCustomerNext(next: unknown): string {
  if (typeof next !== "string") return "/account";
  return /^\/(account|checkout)(\/[A-Za-z0-9/_-]*)?(\?[A-Za-z0-9=&_-]*)?$/.test(
    next,
  ) && !next.startsWith("/account/login")
    ? next
    : "/account";
}
