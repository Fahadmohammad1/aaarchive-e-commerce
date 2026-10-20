import { z } from "zod";
import { emailSchema } from "./auth.js";
import { couponCodeSchema } from "./coupon.js";
import { normalizeOrderNumber } from "./order-number.js";
import { bdPhoneSchema } from "./phone.js";

// Cart, checkout and order tracking (PRD §5.7–5.9, §8.4). The web sends only
// variant ids and quantities; the API prices everything (golden rule 2).

/** Lines per cart. Quantities per variant are capped by settings (default 5). */
export const CART_MAX_LINES = 20;
/** Hard upper bound for any quantity in a request; the store's cap is lower. */
export const CART_QTY_MAX = 99;

export const cartItemSchema = z.strictObject({
  variantId: z.string().trim().min(1).max(40),
  quantity: z.number().int().min(1).max(CART_QTY_MAX),
});
export type CartItemInput = z.infer<typeof cartItemSchema>;

export const cartItemsSchema = z
  .array(cartItemSchema)
  .min(1, { message: "CART_EMPTY" })
  .max(CART_MAX_LINES, { message: "CART_TOO_LARGE" })
  .refine(
    (items) => new Set(items.map((i) => i.variantId)).size === items.length,
    { message: "DUPLICATE_ITEM" },
  );

/** POST /cart/validate. An empty cart is valid here (nothing to check). */
export const cartValidateSchema = z.strictObject({
  items: z.array(cartItemSchema).max(CART_MAX_LINES),
});
export type CartValidateInput = z.infer<typeof cartValidateSchema>;

/** POST /coupons/apply. The phone, when known, lets per-phone limits apply. */
export const couponApplySchema = z.strictObject({
  code: couponCodeSchema,
  items: cartItemsSchema,
  phone: bdPhoneSchema.optional(),
});
export type CouponApplyInput = z.input<typeof couponApplySchema>;

// ── Checkout form (PRD §5.8) ───────────────────────────────────────────────

/** The 64 districts of Bangladesh, for the checkout dropdown. */
export const BD_DISTRICTS = [
  "Bagerhat",
  "Bandarban",
  "Barguna",
  "Barishal",
  "Bhola",
  "Bogura",
  "Brahmanbaria",
  "Chandpur",
  "Chapainawabganj",
  "Chattogram",
  "Chuadanga",
  "Cox's Bazar",
  "Cumilla",
  "Dhaka",
  "Dinajpur",
  "Faridpur",
  "Feni",
  "Gaibandha",
  "Gazipur",
  "Gopalganj",
  "Habiganj",
  "Jamalpur",
  "Jashore",
  "Jhalokati",
  "Jhenaidah",
  "Joypurhat",
  "Khagrachhari",
  "Khulna",
  "Kishoreganj",
  "Kurigram",
  "Kushtia",
  "Lakshmipur",
  "Lalmonirhat",
  "Madaripur",
  "Magura",
  "Manikganj",
  "Meherpur",
  "Moulvibazar",
  "Munshiganj",
  "Mymensingh",
  "Naogaon",
  "Narail",
  "Narayanganj",
  "Narsingdi",
  "Natore",
  "Netrokona",
  "Nilphamari",
  "Noakhali",
  "Pabna",
  "Panchagarh",
  "Patuakhali",
  "Pirojpur",
  "Rajbari",
  "Rajshahi",
  "Rangamati",
  "Rangpur",
  "Satkhira",
  "Shariatpur",
  "Sherpur",
  "Sirajganj",
  "Sunamganj",
  "Sylhet",
  "Tangail",
  "Thakurgaon",
] as const;
export type BdDistrict = (typeof BD_DISTRICTS)[number];

/** Form fields send "" when left empty; treat that as "not given". */
const blankToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

function requiredText(min: number, max: number) {
  return z
    .string({ message: "REQUIRED" })
    .trim()
    .min(1, { message: "REQUIRED" })
    .min(min, { message: "TOO_SHORT" })
    .max(max, { message: "TOO_LONG" });
}

function optionalText(max: number) {
  return z.preprocess(
    blankToUndefined,
    z.string().trim().max(max, { message: "TOO_LONG" }).optional(),
  );
}

/**
 * bKash and Nagad transaction ids: letters and digits (bKash uses 10, Nagad
 * 8). Upper-cased so the uniqueness check cannot be dodged by changing case.
 */
export const trxIdSchema = z
  .string({ message: "REQUIRED" })
  .trim()
  .min(1, { message: "REQUIRED" })
  .transform((v) => v.toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]{6,20}$/, { message: "INVALID_TRXID" }));

export const WALLET_METHODS = ["BKASH", "NAGAD"] as const;
export type WalletMethod = (typeof WALLET_METHODS)[number];

/** A manual bKash/Nagad payment: the number it was sent from and its TrxID. */
const walletPaymentFields = {
  senderNumber: bdPhoneSchema,
  trxId: trxIdSchema,
};

export const checkoutPaymentSchema = z.discriminatedUnion("method", [
  z.strictObject({
    method: z.literal("COD"),
    /** Required when the store asks for the delivery charge in advance. */
    advance: z
      .strictObject({
        method: z.enum(WALLET_METHODS),
        ...walletPaymentFields,
      })
      .optional(),
  }),
  z.strictObject({ method: z.literal("BKASH"), ...walletPaymentFields }),
  z.strictObject({ method: z.literal("NAGAD"), ...walletPaymentFields }),
  /** Online payment: the customer pays on SSLCommerz's page after the order is created. */
  z.strictObject({ method: z.literal("SSLCOMMERZ") }),
]);
export type CheckoutPayment = z.infer<typeof checkoutPaymentSchema>;

export const checkoutSchema = z.strictObject({
  name: requiredText(2, 60),
  phone: bdPhoneSchema,
  altPhone: z.preprocess(blankToUndefined, bdPhoneSchema.optional()),
  email: z.preprocess(blankToUndefined, emailSchema.optional()),
  zoneId: z.string({ message: "REQUIRED" }).min(1, { message: "REQUIRED" }),
  district: z.enum(BD_DISTRICTS, { message: "REQUIRED" }),
  area: requiredText(2, 80),
  address: requiredText(5, 200),
  note: optionalText(300),
  couponCode: z.preprocess(blankToUndefined, couponCodeSchema.optional()),
  payment: checkoutPaymentSchema,
  items: cartItemsSchema,
  /** Signed-in customers: keep this address in their account (ignored for guests). */
  saveAddress: z.boolean().optional(),
  /** Cloudflare Turnstile token; the API verifies it (skipped locally). */
  turnstileToken: z.string().max(4096).optional(),
});
export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutValues = z.output<typeof checkoutSchema>;

// ── Order tracking (PRD §5.9) ──────────────────────────────────────────────

export { ORDER_NUMBER_PREFIX } from "./order-number.js";

/** "aar-24101", "AAR 24101" and "24101" all mean AAR-24101. */
export const orderNumberSchema = z
  .string({ message: "REQUIRED" })
  .transform((value, ctx) => {
    const number = normalizeOrderNumber(value);
    if (!number) {
      ctx.addIssue({ code: "custom", message: "INVALID_ORDER_NUMBER" });
      return z.NEVER;
    }
    return number;
  });

export const trackOrderSchema = z.strictObject({
  phone: bdPhoneSchema,
  orderNumber: orderNumberSchema,
});
export type TrackOrderInput = z.input<typeof trackOrderSchema>;
