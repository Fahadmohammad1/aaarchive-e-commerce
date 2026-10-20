"use client";

import type { AddressInput } from "@aaarchive/shared/account";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAccount } from "@/components/providers/account-provider";
import * as accountApi from "./account-api";
import { accountKeys } from "./account-keys";

// Every hook waits for the session (useAccount) before asking the API.

export function useProfile() {
  const { status } = useAccount();
  return useQuery({
    queryKey: accountKeys.profile(),
    queryFn: ({ signal }) => accountApi.getProfile(signal),
    enabled: status === "authenticated",
  });
}

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: accountApi.updateProfile,
    onSuccess: (profile) => client.setQueryData(accountKeys.profile(), profile),
  });
}

export function useChangePassword() {
  const { applySession } = useAccount();
  return useMutation({
    mutationFn: accountApi.changePassword,
    onSuccess: applySession,
  });
}

export function useResendVerification() {
  return useMutation({ mutationFn: accountApi.resendVerification });
}

export function useAccountOrders() {
  const { status } = useAccount();
  return useInfiniteQuery({
    queryKey: accountKeys.orders(),
    queryFn: ({ pageParam, signal }) => accountApi.getOrders(pageParam, signal),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.meta.page * last.meta.limit < last.meta.total
        ? last.meta.page + 1
        : undefined,
    enabled: status === "authenticated",
  });
}

export function useAccountOrder(orderNumber: string) {
  const { status } = useAccount();
  return useQuery({
    queryKey: accountKeys.order(orderNumber),
    queryFn: ({ signal }) => accountApi.getOrder(orderNumber, signal),
    enabled: status === "authenticated",
  });
}

export function useClaimOrder() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: accountApi.claimOrder,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: accountKeys.orders() }),
  });
}

export function useAddresses(enabled = true) {
  const { status } = useAccount();
  return useQuery({
    queryKey: accountKeys.addresses(),
    queryFn: ({ signal }) => accountApi.getAddresses(signal),
    enabled: enabled && status === "authenticated",
  });
}

export function useSaveAddress() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: AddressInput }) =>
      id
        ? accountApi.updateAddress(id, input)
        : accountApi.createAddress(input),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: accountKeys.addresses() }),
  });
}

export function useDeleteAddress() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: accountApi.deleteAddress,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: accountKeys.addresses() }),
  });
}
