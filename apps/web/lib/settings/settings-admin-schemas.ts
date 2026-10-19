import { mediaAssetSchema } from "@aaarchive/shared/media";
import { z } from "zod";

/** GET /admin/settings: every setting (complete, default-filled) + media. */
export const adminSettingsSchema = z.object({
  settings: z.record(z.string(), z.unknown()),
  media: z.record(z.string(), mediaAssetSchema),
});
export type AdminSettings = z.infer<typeof adminSettingsSchema>;
