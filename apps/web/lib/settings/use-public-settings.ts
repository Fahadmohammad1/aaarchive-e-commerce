"use client";

import { useQuery } from "@tanstack/react-query";
import { settingsKeys } from "./settings-keys";
import { getPublicSettings } from "./settings-store-api";

export function usePublicSettings() {
  return useQuery({
    queryKey: settingsKeys.public(),
    queryFn: ({ signal }) => getPublicSettings(signal),
  });
}
