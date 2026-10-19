"use client";

import { useQuery } from "@tanstack/react-query";
import { zoneKeys } from "./delivery-zone-keys";
import { listStoreZones } from "./delivery-zone-store-api";

export function useStoreZones() {
  return useQuery({
    queryKey: zoneKeys.store(),
    queryFn: ({ signal }) => listStoreZones(signal),
  });
}
