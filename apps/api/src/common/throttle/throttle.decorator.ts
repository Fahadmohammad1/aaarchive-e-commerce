import { SetMetadata } from "@nestjs/common";

/** A route's own limit: at most `limit` requests per `ttl` ms per client IP. */
export type ThrottleLimit = { limit: number; ttl: number };

export const THROTTLE_KEY = "aaarchive:throttle";

/**
 * Stricter limit for one route (login, checkout, exports…), replacing the
 * global THROTTLE_LIMIT / THROTTLE_TTL_SECONDS. Same call shape as
 * @nestjs/throttler, which this replaces (architecture §4.11).
 */
export const Throttle = (options: { default: ThrottleLimit }) =>
  SetMetadata(THROTTLE_KEY, options.default);
