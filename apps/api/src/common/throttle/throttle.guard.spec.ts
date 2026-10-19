import { type ExecutionContext, HttpException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import type { Env } from "../../config/env.schema.js";
import { Throttle } from "./throttle.decorator.js";
import { ThrottleGuard } from "./throttle.guard.js";

const SECRET = "s".repeat(40);

class Routes {
  open() {}
  @Throttle({ default: { limit: 2, ttl: 1_000 } })
  strict() {}
}

function makeGuard() {
  const values: Partial<Env> = {
    THROTTLE_LIMIT: 3,
    THROTTLE_TTL_SECONDS: 60,
    API_PROXY_SECRET: SECRET,
  };
  const config = {
    get: (key: keyof Env) => values[key],
  } as unknown as ConfigService<Env, true>;
  return new ThrottleGuard(new Reflector(), config);
}

function context(
  handler: keyof Routes,
  req: { ip?: string; method?: string; headers?: Record<string, string> } = {},
) {
  const headers = req.headers ?? {};
  const setHeader = vi.fn();
  const request = {
    ip: req.ip ?? "1.1.1.1",
    method: req.method ?? "POST",
    header: (name: string) => headers[name.toLowerCase()],
  };
  const ctx = {
    getType: () => "http",
    getClass: () => Routes,
    getHandler: () => Routes.prototype[handler],
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ setHeader }),
    }),
  } as unknown as ExecutionContext;
  return { ctx, setHeader };
}

function statusOf(guard: ThrottleGuard, ctx: ExecutionContext) {
  try {
    return guard.canActivate(ctx) ? 200 : 403;
  } catch (e) {
    return e instanceof HttpException ? e.getStatus() : 500;
  }
}

afterEach(() => vi.useRealTimers());

test("uses the global limit when a route sets none", () => {
  const guard = makeGuard();
  const { ctx } = context("open");
  const statuses = [1, 2, 3, 4].map(() => statusOf(guard, ctx));
  expect(statuses).toEqual([200, 200, 200, 429]);
});

test("a route's @Throttle limit replaces the global one", () => {
  const guard = makeGuard();
  const { ctx } = context("strict");
  const statuses = [1, 2, 3].map(() => statusOf(guard, ctx));
  expect(statuses).toEqual([200, 200, 429]);
});

test("answers 429 RATE_LIMITED with Retry-After", () => {
  const guard = makeGuard();
  const { ctx, setHeader } = context("strict");
  guard.canActivate(ctx);
  guard.canActivate(ctx);
  try {
    guard.canActivate(ctx);
    expect.unreachable();
  } catch (e) {
    expect((e as HttpException).getStatus()).toBe(429);
    expect((e as HttpException).getResponse()).toMatchObject({
      code: "RATE_LIMITED",
    });
  }
  expect(setHeader).toHaveBeenCalledWith("Retry-After", "1");
});

test("counts each IP and each route separately", () => {
  const guard = makeGuard();
  const a = context("strict", { ip: "1.1.1.1" }).ctx;
  const b = context("strict", { ip: "2.2.2.2" }).ctx;
  guard.canActivate(a);
  guard.canActivate(a);
  expect(statusOf(guard, a)).toBe(429);
  expect(statusOf(guard, b)).toBe(200);
  expect(statusOf(guard, context("open", { ip: "1.1.1.1" }).ctx)).toBe(200);
});

test("allows requests again once the window has passed", () => {
  vi.useFakeTimers();
  const guard = makeGuard();
  const { ctx } = context("strict");
  guard.canActivate(ctx);
  guard.canActivate(ctx);
  expect(statusOf(guard, ctx)).toBe(429);
  vi.advanceTimersByTime(1_001);
  expect(statusOf(guard, ctx)).toBe(200);
});

test("skips the website's server-side page reads, but not forged ones", () => {
  const guard = makeGuard();
  const render = {
    method: "GET",
    headers: { "x-aaarchive-proxy": SECRET, "x-aaarchive-ssr": "1" },
  };
  const ctx = context("strict", render).ctx;
  expect([1, 2, 3, 4].map(() => statusOf(guard, ctx))).toEqual([
    200, 200, 200, 200,
  ]);
  const forged = context("strict", {
    method: "GET",
    ip: "3.3.3.3",
    headers: { "x-aaarchive-proxy": "wrong", "x-aaarchive-ssr": "1" },
  }).ctx;
  expect([1, 2, 3].map(() => statusOf(guard, forged))).toEqual([200, 200, 429]);
});
