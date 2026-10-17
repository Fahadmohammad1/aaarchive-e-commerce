import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import type { Env } from "../../config/env.schema.js";

/**
 * CSRF defence for cookie-authenticated requests (rules.md §8.2), on top of
 * SameSite=Lax: on state-changing methods the browser's Origin (or Referer)
 * must be our own site.
 * Use with @UseGuards(SameOriginGuard).
 */
@Injectable()
export class SameOriginGuard implements CanActivate {
  private readonly logger = new Logger("Security");
  private readonly allowed: string;

  constructor(config: ConfigService<Env, true>) {
    this.allowed = new URL(
      config.get("FRONTEND_ORIGIN", { infer: true }),
    ).origin;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    // Reads cannot change anything, and browsers omit Origin on same-site GETs.
    if (SAFE_METHODS.has(request.method)) return true;
    const origin =
      request.header("origin") ?? originOf(request.header("referer"));
    if (origin === this.allowed) return true;
    this.logger.warn(
      `Cross-origin request refused on ${request.originalUrl.split("?")[0]}`,
    );
    throw new ForbiddenException({
      message: "Request refused",
      code: "ORIGIN_NOT_ALLOWED",
    });
  }
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function originOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}
