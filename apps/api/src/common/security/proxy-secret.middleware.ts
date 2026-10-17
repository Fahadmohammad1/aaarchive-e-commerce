import { timingSafeEqual } from "node:crypto";
import { ForbiddenException, Injectable, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NextFunction, Request, Response } from "express";
import type { Env } from "../../config/env.schema.js";

export const PROXY_SECRET_HEADER = "x-aaarchive-proxy";

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
    const header = req.header(PROXY_SECRET_HEADER);
    const given = Buffer.from(header ?? "");
    const ok =
      given.length === this.secret.length &&
      timingSafeEqual(given, this.secret);
    if (!ok) {
      throw new ForbiddenException({ message: "Forbidden", code: "FORBIDDEN" });
    }
    next();
  }
}
