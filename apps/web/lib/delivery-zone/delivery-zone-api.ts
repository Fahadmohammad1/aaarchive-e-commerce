import type {
  DeliveryZoneInput,
  DeliveryZoneUpdate,
} from "@aaarchive/shared/delivery";
import { api } from "@/lib/api/api-client";
import { adminZoneSchema, zoneListSchema } from "./delivery-zone-schemas";

export function listZones(signal?: AbortSignal) {
  return api.get("/admin/zones", { schema: zoneListSchema, signal });
}

export function createZone(body: DeliveryZoneInput) {
  return api.post("/admin/zones", { body, schema: adminZoneSchema });
}

export function updateZone(id: string, body: DeliveryZoneUpdate) {
  return api.patch(`/admin/zones/${encodeURIComponent(id)}`, {
    body,
    schema: adminZoneSchema,
  });
}

export function deleteZone(id: string): Promise<void> {
  return api.delete(`/admin/zones/${encodeURIComponent(id)}`);
}
