"use client";

import type { DeliveryZoneInput } from "@aaarchive/shared/delivery";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createZone,
  deleteZone,
  listZones,
  updateZone,
} from "./delivery-zone-api";
import { zoneKeys } from "./delivery-zone-keys";

export function useZones() {
  return useQuery({
    queryKey: zoneKeys.admin(),
    queryFn: ({ signal }) => listZones(signal),
  });
}

/** Create (no id) or update (id); the form always sends every field. */
export function useSaveZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: DeliveryZoneInput }) =>
      id ? updateZone(id, body) : createZone(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: zoneKeys.all }),
  });
}

export function useDeleteZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteZone,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: zoneKeys.all }),
  });
}
