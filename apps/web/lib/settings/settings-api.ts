import type {
  CourierSettingsInput,
  SettingKey,
} from "@aaarchive/shared/settings";
import { z } from "zod";
import { api } from "@/lib/api/api-client";
import { adminSettingsSchema } from "./settings-admin-schemas";

// Dashboard settings calls (Phase 5: couriers; the rest in Phase 6).

export const courierListSchema = z.object({
  couriers: z.array(z.object({ name: z.string(), trackingUrl: z.string() })),
});
export type CourierList = z.infer<typeof courierListSchema>;

export function getCouriers(signal?: AbortSignal) {
  return api.get("/admin/settings/couriers", {
    schema: courierListSchema,
    signal,
  });
}

export function saveCouriers(body: CourierSettingsInput) {
  return api.put("/admin/settings/couriers", {
    body,
    schema: courierListSchema,
  });
}

export function getAdminSettings(signal?: AbortSignal) {
  return api.get("/admin/settings", { schema: adminSettingsSchema, signal });
}

export function saveSetting(key: SettingKey, value: unknown) {
  return api.put(`/admin/settings/${key}`, { body: { value } });
}
