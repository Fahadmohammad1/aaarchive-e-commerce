"use client";

import type {
  BlockPhoneInput,
  CustomerListQuery,
} from "@aaarchive/shared/customer";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  blockPhone,
  getCustomer,
  listBlockedPhones,
  listCustomers,
  unblockPhone,
} from "./customer-api";
import { customerKeys } from "./customer-keys";

export function useCustomers(query: CustomerListQuery) {
  return useQuery({
    queryKey: customerKeys.list(query),
    queryFn: ({ signal }) => listCustomers(query, signal),
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(phone: string) {
  return useQuery({
    queryKey: customerKeys.detail(phone),
    queryFn: ({ signal }) => getCustomer(phone, signal),
  });
}

export function useBlockedPhones(q = "") {
  return useQuery({
    queryKey: customerKeys.blocked(q),
    queryFn: ({ signal }) => listBlockedPhones(q, signal),
    placeholderData: keepPreviousData,
  });
}

/** Block or unblock: customer lists show the flag, so refresh them all. */
export function useBlockPhone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BlockPhoneInput) => blockPhone(body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

export function useUnblockPhone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unblockPhone,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  });
}
