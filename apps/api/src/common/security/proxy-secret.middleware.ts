import { timingSafeEqual } from "node:crypto";
import { ForbiddenException, Injectable, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NextFunction, Request, Response } from "express";
import type { Env } from "../../config/env.schema.js";

export const PROXY_SECRET_HEADER = "x-aaarchive-proxy";
/**
 * Set by the website's own server (Server Components), never by a browser:
 * proxy.ts strips it from visitor requests. Only trusted together with a
 * valid secret.
 */
export const SERVER_RENDER_HEADER = "x-aaarchive-ssr";

/** Constant-time check of the shared secret header. */
export function hasProxySecret(req: Request, secret: Buffer | null): boolean {
  if (!secret) return false;
  const given = Buffer.from(req.header(PROXY_SECRET_HEADER) ?? "");
  return given.length === secret.length && timingSafeEqual(given, secret);
}

/**
 * A read made by the website's server while rendering a page. Its IP is the
 * web server's, so per-IP limits would throttle every visitor at once; these
 * reads are skipped by the rate limiter instead (they are mostly cached).
 */
export function isServerRender(req: Request, secret: Buffer | null): boolean {
  return (
    (req.method === "GET" || req.method === "HEAD") &&
    req.header(SERVER_RENDER_HEADER) === "1" &&
    hasProxySecret(req, secret)
  );
}

/**
 * Refuses requests that did not come through the web app's proxy.ts (which
 * adds the shared secret). Stops anyone calling the API directly to dodge rate
 * limits or spoof X-Forwarded-For. Off when API_PROXY_SECRET is unset (local
 * dev); required in production. /health stays open for uptime monitors.
 */
@Injectable()
export class ProxySecretMiddleware implements NestMiddleware {
  private readonly secret: Buffer | null;

  constructor(config: ConfigService<Env, true>) {
    const value = config.get("API_PROXY_SECRET", { infer: true });
    this.secret = value ? Buffer.from(value) : null;
  }

  use(req: Request, _res: Response, next: NextFunction) {
    if (!this.secret) return next();
    if (!hasProxySecret(req, this.secret)) {
      throw new ForbiddenException({ message: "Forbidden", code: "FORBIDDEN" });
    }
    next();
  }
}
