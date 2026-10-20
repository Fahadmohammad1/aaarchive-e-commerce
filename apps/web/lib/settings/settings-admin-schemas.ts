import { mediaAssetSchema } from "@aaarchive/shared/media";
import { z } from "zod";

/** GET /admin/settings: every setting (complete, default-filled) + media. */
export const adminSettingsSchema = z.object({
  settings: z.record(z.string(), z.unknown()),
  media: z.record(z.string(), mediaAssetSchema),
  /** Set on the server (env vars); shown read-only next to their switches. */
  integrations: z.object({
    sslcommerz: z.object({ configured: z.boolean(), sandbox: z.boolean() }),
    google: z.object({ configured: z.boolean() }),
  }),
});
export type AdminSettings = z.infer<typeof adminSettingsSchema>;
