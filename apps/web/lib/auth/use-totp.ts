"use client";

import type { TotpDisableInput } from "@aaarchive/shared/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { disableTotp, enableTotp, getTotpStatus, setupTotp } from "./auth-api";

export const totpKeys = { status: ["auth", "totp"] as const };

export function useTotpStatus() {
  return useQuery({
    queryKey: totpKeys.status,
    queryFn: ({ signal }) => getTotpStatus(signal),
  });
}

export function useTotpSetup() {
  return useMutation({ mutationFn: setupTotp });
}

export function useTotpEnable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => enableTotp(code),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: totpKeys.status }),
  });
}

export function useTotpDisable() {
  return useMutation({
    mutationFn: (input: TotpDisableInput) => disableTotp(input),
  });
}
