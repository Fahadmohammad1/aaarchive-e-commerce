import type { Role } from "@aaarchive/shared/auth";

/** What guards attach to `request.user` after verifying the access token. */
export type RequestUser = {
  id: string;
  name: string;
  email: string | null;
  role: Role;
  /** Refresh-token family of this login session. */
  sessionId: string;
};

export type AccessTokenPayload = {
  sub: string;
  /** User.tokenVersion at sign-in; a bump invalidates the token. */
  tv: number;
  /** Session (refresh-token family) id. */
  sid: string;
};
