import {
  type AuthUser,
  authUserSchema,
  type ChangePasswordInput,
  type LoginInput,
  type LoginResponse,
  loginResponseSchema,
  type SessionResponse,
  sessionResponseSchema,
  type TotpDisableInput,
  type TotpLoginInput,
  totpSetupSchema,
  totpStatusSchema,
} from "@aaarchive/shared/auth";
import { z } from "zod";
import { api } from "@/lib/api/api-client";

// Auth calls never trigger the client's refresh-and-retry (skipAuthRefresh).
const authOptions = { skipAuthRefresh: true } as const;

/** A session, or a two-factor challenge when the account has it on. */
export function login(input: LoginInput): Promise<LoginResponse> {
  return api.post("/auth/login", {
    ...authOptions,
    body: input,
    schema: loginResponseSchema,
  });
}

export function loginWithTotp(input: TotpLoginInput): Promise<SessionResponse> {
  return api.post("/auth/login/totp", {
    ...authOptions,
    body: input,
    schema: sessionResponseSchema,
  });
}

export const getTotpStatus = (signal?: AbortSignal) =>
  api.get("/auth/totp", { schema: totpStatusSchema, signal });
export const setupTotp = () =>
  api.post("/auth/totp/setup", { schema: totpSetupSchema });
export const enableTotp = (code: string) =>
  api.post("/auth/totp/enable", {
    body: { code },
    schema: z.object({ backupCodes: z.array(z.string()) }),
  });
export const disableTotp = (input: TotpDisableInput): Promise<void> =>
  api.post("/auth/totp/disable", { body: input });

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
