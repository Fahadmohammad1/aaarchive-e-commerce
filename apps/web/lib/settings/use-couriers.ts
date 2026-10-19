"use client";

import type { CourierSettingsInput } from "@aaarchive/shared/settings";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCouriers, saveCouriers } from "./settings-api";
import { settingsKeys } from "./settings-keys";

export function useCouriers() {
  return useQuery({
    queryKey: settingsKeys.couriers(),
    queryFn: ({ signal }) => getCouriers(signal),
  });
}

export function useSaveCouriers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CourierSettingsInput) => saveCouriers(body),
    onSuccess: (data) =>
      queryClient.setQueryData(settingsKeys.couriers(), data),
  });
}
