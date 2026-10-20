import {
  type AccountOrderSummary,
  type AccountProfile,
  type AddressInput,
  accountOrderSummarySchema,
  accountProfileSchema,
  type ForgotPasswordInput,
  type ProfileUpdateInput,
  type RegisterInput,
  type ResetPasswordInput,
  type SavedAddress,
  savedAddressSchema,
} from "@aaarchive/shared/account";
import {
  type ChangePasswordInput,
  type LoginInput,
  type SessionResponse,
  sessionResponseSchema,
} from "@aaarchive/shared/auth";
import type { TrackOrderInput } from "@aaarchive/shared/checkout";
import { z } from "zod";
import { api } from "@/lib/api/api-client";
import { pagedSchema } from "@/lib/api/paged";
import type { PublicOrder } from "@/lib/order/order-types";

// Customer accounts (PRD §5.10; docs/architecture.md §4.6). Only /account/**
// and /checkout import this, so Zod stays out of other storefront chunks
// (rules.md §4.2).

// Sign-in calls never trigger the client's refresh-and-retry (it would loop).
const authOptions = { skipAuthRefresh: true } as const;

export const register = (input: RegisterInput): Promise<SessionResponse> =>
  api.post("/account/auth/register", {
    ...authOptions,
    body: input,
    schema: sessionResponseSchema,
  });

export const login = (input: LoginInput): Promise<SessionResponse> =>
  api.post("/account/auth/login", {
    ...authOptions,
    body: input,
    schema: sessionResponseSchema,
  });

/** Exchanges the httpOnly customer refresh cookie for a new access token. */
export const refresh = (): Promise<SessionResponse> =>
  api.post("/account/auth/refresh", {
    ...authOptions,
    schema: sessionResponseSchema,
  });

export const logout = (): Promise<void> =>
  api.post("/account/auth/logout", authOptions);

export const logoutEverywhere = (): Promise<void> =>
  api.post("/account/logout-all");

export const forgotPassword = (input: ForgotPasswordInput): Promise<void> =>
  api.post("/account/auth/forgot-password", { ...authOptions, body: input });

export const resetPassword = (input: ResetPasswordInput): Promise<void> =>
  api.post("/account/auth/reset-password", { ...authOptions, body: input });

export const verifyEmail = (token: string): Promise<void> =>
  api.post("/account/auth/verify-email", {
    ...authOptions,
    body: { token },
  });

/** Google sign-in is a full-page navigation through the API (OAuth redirect). */
export function googleSignInUrl(next: string): string {
  return `/api/v1/account/auth/google?next=${encodeURIComponent(next)}`;
}

export const getProfile = (signal?: AbortSignal): Promise<AccountProfile> =>
  api.get("/account/me", { schema: accountProfileSchema, signal });

export const updateProfile = (
  input: ProfileUpdateInput,
): Promise<AccountProfile> =>
  api.patch("/account/me", { body: input, schema: accountProfileSchema });

export const changePassword = (
  input: ChangePasswordInput,
): Promise<SessionResponse> =>
  api.post("/account/change-password", {
    body: input,
    schema: sessionResponseSchema,
  });

export const resendVerification = (): Promise<void> =>
  api.post("/account/verify-email/resend");

const ordersPage = pagedSchema(accountOrderSummarySchema);
export type AccountOrdersPage = {
  data: AccountOrderSummary[];
  meta: { page: number; limit: number; total: number };
};

export const getOrders = (
  page: number,
  signal?: AbortSignal,
): Promise<AccountOrdersPage> =>
  api.get("/account/orders", {
    query: { page, limit: 10 },
    schema: ordersPage,
    signal,
  });

/** Same public shape as tracking (masked phone, no address). */
export const getOrder = (
  orderNumber: string,
  signal?: AbortSignal,
): Promise<PublicOrder> =>
  api.get<PublicOrder>(`/account/orders/${encodeURIComponent(orderNumber)}`, {
    signal,
  });

export const claimOrder = (input: TrackOrderInput): Promise<PublicOrder> =>
  api.post<PublicOrder>("/account/orders/claim", { body: input });

export const getAddresses = (signal?: AbortSignal): Promise<SavedAddress[]> =>
  api.get("/account/addresses", {
    schema: z.array(savedAddressSchema),
    signal,
  });

export const createAddress = (input: AddressInput): Promise<SavedAddress> =>
  api.post("/account/addresses", { body: input, schema: savedAddressSchema });

export const updateAddress = (
  id: string,
  input: AddressInput,
): Promise<SavedAddress> =>
  api.put(`/account/addresses/${encodeURIComponent(id)}`, {
    body: input,
    schema: savedAddressSchema,
  });

export const deleteAddress = (id: string): Promise<void> =>
  api.delete(`/account/addresses/${encodeURIComponent(id)}`);
