"use client";

import type { SettingKey } from "@aaarchive/shared/settings";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminSettings, saveSetting } from "./settings-api";
import { settingsKeys } from "./settings-keys";

export function useAdminSettings() {
  return useQuery({
    queryKey: settingsKeys.admin(),
    queryFn: ({ signal }) => getAdminSettings(signal),
  });
}

export function useSaveSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: SettingKey; value: unknown }) =>
      saveSetting(key, value),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: settingsKeys.all }),
  });
}
