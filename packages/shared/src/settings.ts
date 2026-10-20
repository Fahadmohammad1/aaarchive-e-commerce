import { z } from "zod";
import { imageSchema } from "./content.js";
import { bdPhoneSchema } from "./phone.js";
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  DEFAULT_MAX_QTY_PER_VARIANT,
} from "./stock.js";

// Store settings (PRD §6.8), one `Setting` row per key. Every schema fills in
// defaults, so a missing or older row still reads as a complete value. The
// dashboard forms for these arrive in Phase 6; checkout reads them now.

const walletSchema = z.object({
  enabled: z.boolean().default(true),
  /** The store's bKash/Nagad number customers send money to ("" = not set). */
  number: z.union([z.literal(""), bdPhoneSchema]).default(""),
  /** Extra steps shown under the number ("Use Send Money…"). */
  instructions: z.string().trim().max(500).default(""),
});

export const paymentSettingsSchema = z.object({
  cod: z.object({ enabled: z.boolean().default(true) }).default({
    enabled: true,
  }),
  bkash: walletSchema.default({ enabled: true, number: "", instructions: "" }),
  nagad: walletSchema.default({ enabled: true, number: "", instructions: "" }),
  /** COD orders must pay the delivery charge in advance by bKash/Nagad (PRD §5.8). */
  codAdvanceDeliveryCharge: z.boolean().default(false),
  /**
   * Online payment through SSLCommerz (owner, 2026-10-21): off by default. The
   * merchant credentials are API env vars; the API refuses to switch it on
   * without them.
   */
  sslcommerz: z
    .object({ enabled: z.boolean().default(false) })
    .default({ enabled: false }),
});
export type PaymentSettings = z.output<typeof paymentSettingsSchema>;

export const stockSettingsSchema = z.object({
  lowStockThreshold: z
    .number()
    .int()
    .min(0)
    .max(999)
    .default(DEFAULT_LOW_STOCK_THRESHOLD),
  maxQtyPerVariant: z
    .number()
    .int()
    .min(1)
    .max(99)
    .default(DEFAULT_MAX_QTY_PER_VARIANT),
});
export type StockSettings = z.output<typeof stockSettingsSchema>;

export const deliverySettingsSchema = z.object({
  /** Orders whose goods total reaches this get free delivery; null = never. */
  freeDeliveryThreshold: z.number().int().min(1).nullable().default(null),
});
export type DeliverySettings = z.output<typeof deliverySettingsSchema>;

/** A wallet is offered only when it is switched on and has a number to pay. */
export function walletAvailable(wallet: PaymentSettings["bkash"]): boolean {
  return wallet.enabled && wallet.number.length > 0;
}

// ── Couriers (PRD §5.9, §6.4) ──────────────────────────────────────────────
// The store can use several courier services. Each may have a tracking page
// pattern; "{tracking}" is replaced by the order's tracking number.

export const TRACKING_PLACEHOLDER = "{tracking}";

export const courierSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, { message: "REQUIRED" })
    .max(40, { message: "TOO_LONG" }),
  /** e.g. https://courier.example/track/{tracking}; "" = no link. */
  trackingUrl: z
    .string()
    .trim()
    .max(300, { message: "TOO_LONG" })
    .refine(
      (v) =>
        v === "" ||
        (/^https:\/\/[^\s"'<>]+$/.test(v) && v.includes(TRACKING_PLACEHOLDER)),
      { message: "INVALID_TRACKING_URL" },
    )
    .default(""),
});
export type Courier = z.output<typeof courierSchema>;

export const courierSettingsSchema = z.object({
  couriers: z
    .array(courierSchema)
    .max(20, { message: "TOO_MANY" })
    .refine(
      (list) =>
        new Set(list.map((c) => c.name.toLowerCase())).size === list.length,
      { message: "DUPLICATE" },
    )
    .default([]),
});
export type CourierSettings = z.output<typeof courierSettingsSchema>;
export type CourierSettingsInput = z.input<typeof courierSettingsSchema>;

/** The tracking page for this courier + number, or null (unknown courier, no pattern). */
export function courierTrackingUrl(
  couriers: readonly Courier[],
  name: string | null,
  trackingNumber: string | null,
): string | null {
  if (!name || !trackingNumber) return null;
  const courier = couriers.find(
    (c) => c.name.toLowerCase() === name.trim().toLowerCase(),
  );
  if (!courier?.trackingUrl) return null;
  return courier.trackingUrl.replace(
    TRACKING_PLACEHOLDER,
    encodeURIComponent(trackingNumber.trim()),
  );
}

// ── Store, SEO and tracking (PRD §6.8) ─────────────────────────────────────

/** "" means not set; a value must be valid. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.union([z.literal(""), schema]).default("");

const httpsUrl = z
  .string()
  .trim()
  .max(300, { message: "TOO_LONG" })
  .regex(/^https:\/\/\S+$/, { message: "INVALID_HREF" });

export const storeSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "REQUIRED" })
    .max(60)
    .default("Aaarchive"),
  /** Contact phone shown on the contact page. */
  phone: optional(bdPhoneSchema),
  /** WhatsApp number for the floating chat button (wa.me link). */
  whatsapp: optional(bdPhoneSchema),
  /** Messenger link, e.g. https://m.me/aaarchive. */
  messenger: optional(httpsUrl),
  /** Store inbox: contact-form messages go here. */
  email: optional(
    z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email({ message: "INVALID_EMAIL" })),
  ),
  address: z.string().trim().max(300, { message: "TOO_LONG" }).default(""),
  /** Uploaded logo; null = the bundled logo. */
  logo: imageSchema.nullable().default(null),
});
export type StoreSettings = z.output<typeof storeSettingsSchema>;

export const seoSettingsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: "REQUIRED" })
    .max(70, { message: "TOO_LONG" })
    .default("Aaarchive"),
  description: z.string().trim().max(160, { message: "TOO_LONG" }).default(""),
  /** Default share image (Open Graph). */
  ogImage: imageSchema.nullable().default(null),
});
export type SeoSettings = z.output<typeof seoSettingsSchema>;

export const trackingSettingsSchema = z.object({
  ga4Id: optional(
    z
      .string()
      .trim()
      .regex(/^G-[A-Z0-9]{4,20}$/, { message: "INVALID_GA4_ID" }),
  ),
  metaPixelId: optional(
    z
      .string()
      .trim()
      .regex(/^\d{6,20}$/, { message: "INVALID_PIXEL_ID" }),
  ),
  clarityId: optional(
    z
      .string()
      .trim()
      .regex(/^[a-z0-9]{6,20}$/, { message: "INVALID_CLARITY_ID" }),
  ),
});
export type TrackingSettings = z.output<typeof trackingSettingsSchema>;

/**
 * Every `Setting` row the dashboard edits, with its schema. PUT
 * /admin/settings/:key validates with these; the API rejects other keys.
 */
export const settingSchemas = {
  store: storeSettingsSchema,
  seo: seoSettingsSchema,
  payments: paymentSettingsSchema,
  stock: stockSettingsSchema,
  delivery: deliverySettingsSchema,
  tracking: trackingSettingsSchema,
  couriers: courierSettingsSchema,
} as const;
export type SettingKey = keyof typeof settingSchemas;
export const SETTING_KEYS = Object.keys(settingSchemas) as SettingKey[];
export function isSettingKey(value: string): value is SettingKey {
  return value in settingSchemas;
}
