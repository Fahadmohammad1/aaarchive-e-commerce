// Where API requests go (docs/architecture.md §3.4).
// Browser: the relative NEXT_PUBLIC_API_URL ("/api/v1"), rewritten by
// next.config.ts to the NestJS API, so auth cookies stay first-party.
// Server: straight to API_PROXY_TARGET — no hop through our own rewrite.

const DEFAULT_PUBLIC = "/api/v1";
const DEFAULT_SERVER = "http://localhost:4000/api/v1";

export const isServer = typeof window === "undefined";

export function apiBaseUrl(): string {
  if (isServer) {
    return process.env.API_PROXY_TARGET ?? DEFAULT_SERVER;
  }
  return process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_PUBLIC;
}

export const DEFAULT_TIMEOUT_MS = 30_000;
