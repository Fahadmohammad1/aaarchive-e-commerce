import {
  type AuthUser,
  authUserSchema,
  type ChangePasswordInput,
  type LoginInput,
  type SessionResponse,
  sessionResponseSchema,
} from "@aaarchive/shared/auth";
import { api } from "@/lib/api/api-client";

// Auth calls never trigger the client's refresh-and-retry (skipAuthRefresh).
const authOptions = { skipAuthRefresh: true } as const;

export function login(input: LoginInput): Promise<SessionResponse> {
  return api.post("/auth/login", {
    ...authOptions,
    body: input,
    schema: sessionResponseSchema,
  });
}

/** Exchanges the httpOnly refresh cookie for a new access token. */
export function refresh(): Promise<SessionResponse> {
  return api.post("/auth/refresh", {
    ...authOptions,
    schema: sessionResponseSchema,
  });
}

export function logout(): Promise<void> {
  return api.post("/auth/logout", authOptions);
}

export function logoutEverywhere(): Promise<void> {
  return api.post("/auth/logout-all", authOptions);
}

export function me(): Promise<AuthUser> {
  return api.get("/auth/me", { schema: authUserSchema });
}

export function changePassword(
  input: ChangePasswordInput,
): Promise<SessionResponse> {
  return api.post("/auth/change-password", {
    ...authOptions,
    body: input,
    schema: sessionResponseSchema,
  });
}
