// Browser-side session plumbing for the API client. The access token lives in
// memory only; the refresh token is an httpOnly cookie JS never sees
// (docs/architecture.md §4.9). Never set a token on the server: module state is
// shared by every request there.
import { isServer } from "./api-config";

let accessToken: string | null = null;
/** Bumped on every token change, so a 401 from an old request can tell that a
 *  refresh already happened and just retry. */
let generation = 0;

type RefreshHandler = () => Promise<string | null>;
let refreshHandler: RefreshHandler | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function getTokenGeneration(): number {
  return generation;
}

export function setAccessToken(token: string | null): void {
  if (isServer) throw new Error("setAccessToken() must not run on the server");
  accessToken = token;
  generation += 1;
}

/** The auth module (Phase 1) registers how to call POST /auth/refresh. */
export function setRefreshHandler(handler: RefreshHandler | null): void {
  refreshHandler = handler;
}

/**
 * Refreshes once for everyone (single-flight). If the token already changed
 * since `seenGeneration`, a refresh has happened: return the current token.
 */
export async function refreshSession(
  seenGeneration: number,
): Promise<string | null> {
  if (generation !== seenGeneration) return accessToken;
  if (!refreshHandler) return null;
  refreshInFlight ??= refreshHandler().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}
