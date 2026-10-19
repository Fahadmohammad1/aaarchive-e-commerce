"use client";

import { useQuery } from "@tanstack/react-query";
import { getSiteContentClient } from "./content-client-api";
import { contentKeys } from "./content-keys";

/** Menu links etc. for client-only UI (the menu overlay). */
export function useSiteContent() {
  return useQuery({
    queryKey: contentKeys.site(),
    queryFn: ({ signal }) => getSiteContentClient(signal),
    staleTime: 5 * 60_000,
  });
}
