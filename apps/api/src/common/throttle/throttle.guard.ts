import {
  type CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import type { Request, Response } from "express";
import type { Env } from "../../config/env.schema.js";
import { isServerRender } from "../security/proxy-secret.middleware.js";
import { THROTTLE_KEY, type ThrottleLimit } from "./throttle.decorator.js";

type Window = { count: number; resetAt: number };

/** Expired windows are swept at most this often (no timers to keep alive). */
const SWEEP_EVERY_MS = 60_000;

/**
 * Per-IP rate limit for every route (rules.md §8.1), counted per route in a
 * fixed window. Replaces @nestjs/throttler, whose CommonJS build cannot load
 * the ESM-only NestJS 12 on Vercel (architecture §8.1). Counts live in memory:
 * one server = one set of counts; on Vercel each instance counts on its own.
 */
@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly windows = new Map<string, Window>();
  private readonly fallback: ThrottleLimit;
  private readonly secret: Buffer | null;
  private lastSweep = Date.now();

  constructor(
    private readonly reflector: Reflector,
    config: ConfigService<Env, true>,
  ) {
    this.fallback = {
      limit: config.get("THROTTLE_LIMIT", { infer: true }),
      ttl: config.get("THROTTLE_TTL_SECONDS", { infer: true }) * 1000,
    };
    const value = config.get("API_PROXY_SECRET", { infer: true });
    this.secret = value ? Buffer.from(value) : null;
  }

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== "http") return true;
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    // Page renders all come from the web server's one IP: skip them
    // (secret + server header, GET only); visitors stay limited.
    if (isServerRender(req, this.secret)) return true;

    const { limit, ttl } =
      this.reflector.getAllAndOverride<ThrottleLimit | undefined>(
        THROTTLE_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? this.fallback;

    const now = Date.now();
    this.sweep(now);
    const key = `${context.getClass().name}.${context.getHandler().name}|${req.ip ?? "unknown"}`;
    let window = this.windows.get(key);
    if (!window || window.resetAt <= now) {
      window = { count: 0, resetAt: now + ttl };
      this.windows.set(key, window);
    }
    window.count += 1;
    if (window.count <= limit) return true;

    const retryAfter = Math.ceil((window.resetAt - now) / 1000);
    http.getResponse<Response>().setHeader("Retry-After", String(retryAfter));
    throw new HttpException(
      { message: "Too many requests", code: "RATE_LIMITED" },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private sweep(now: number) {
    if (now - this.lastSweep < SWEEP_EVERY_MS) return;
    this.lastSweep = now;
    for (const [key, window] of this.windows) {
      if (window.resetAt <= now) this.windows.delete(key);
    }
  }
}
