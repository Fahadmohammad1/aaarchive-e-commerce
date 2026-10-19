import { describe, expect, test } from "bun:test";
import {
  BD_DISTRICTS,
  cartItemsSchema,
  checkoutSchema,
  orderNumberSchema,
  trackOrderSchema,
  trxIdSchema,
} from "./checkout.js";
import { deliveryChargeFor, deliveryZoneUpdateSchema } from "./delivery.js";
import { paymentSettingsSchema, walletAvailable } from "./settings.js";

const form = {
  name: "Rahim Uddin",
  phone: "+880 1712-345689",
  altPhone: "",
  email: "",
  zoneId: "zone1",
  district: "Dhaka",
  area: "Mirpur 10",
  address: "House 12, Road 4",
  note: "",
  couponCode: "",
  payment: { method: "COD" },
  items: [{ variantId: "v1", quantity: 2 }],
};

describe("checkoutSchema", () => {
  test("normalises the phone and turns empty optional fields into undefined", () => {
    const parsed = checkoutSchema.parse(form);
    expect(parsed.phone).toBe("01712345689");
    expect(parsed.altPhone).toBeUndefined();
    expect(parsed.email).toBeUndefined();
    expect(parsed.couponCode).toBeUndefined();
  });

  test("never accepts a price from the client", () => {
    const result = checkoutSchema.safeParse({
      ...form,
      items: [{ variantId: "v1", quantity: 1, price: 1 }],
    });
    expect(result.success).toBe(false);
    expect(checkoutSchema.safeParse({ ...form, total: 1 }).success).toBe(false);
  });

  test("wallet payments need a sender number and TrxID", () => {
    expect(
      checkoutSchema.safeParse({ ...form, payment: { method: "BKASH" } })
        .success,
    ).toBe(false);
    const parsed = checkoutSchema.parse({
      ...form,
      payment: {
        method: "NAGAD",
        senderNumber: "01812345678",
        trxId: "ab12cd34",
      },
    });
    expect(parsed.payment).toEqual({
      method: "NAGAD",
      senderNumber: "01812345678",
      trxId: "AB12CD34",
    });
  });

  test("rejects an unknown district and an invalid phone", () => {
    expect(
      checkoutSchema.safeParse({ ...form, district: "Paris" }).success,
    ).toBe(false);
    expect(
      checkoutSchema.safeParse({ ...form, phone: "01212345678" }).success,
    ).toBe(false);
  });

  test("has all 64 districts, once each", () => {
    expect(new Set(BD_DISTRICTS).size).toBe(64);
  });
});

describe("cart items", () => {
  test("no duplicates, at least one", () => {
    expect(cartItemsSchema.safeParse([]).success).toBe(false);
    expect(
      cartItemsSchema.safeParse([
        { variantId: "v1", quantity: 1 },
        { variantId: "v1", quantity: 2 },
      ]).success,
    ).toBe(false);
  });
});

describe("tracking", () => {
  test("order numbers in any common spelling", () => {
    for (const input of ["AAR-24101", "aar-24101", "AAR 24101", "24101"]) {
      expect(orderNumberSchema.parse(input)).toBe("AAR-24101");
    }
    expect(orderNumberSchema.safeParse("AAR-12a").success).toBe(false);
  });

  test("phone + order number", () => {
    expect(
      trackOrderSchema.parse({ phone: "8801712345689", orderNumber: "24101" }),
    ).toEqual({ phone: "01712345689", orderNumber: "AAR-24101" });
  });

  test("TrxIDs are upper-cased letters and digits", () => {
    expect(trxIdSchema.parse(" 9ab3cd5ef7 ")).toBe("9AB3CD5EF7");
    expect(trxIdSchema.safeParse("ab-12").success).toBe(false);
  });
});

describe("delivery", () => {
  test("free delivery from the threshold, else the zone charge", () => {
    expect(deliveryChargeFor(70, 2000, null)).toBe(70);
    expect(deliveryChargeFor(70, 2999, 3000)).toBe(70);
    expect(deliveryChargeFor(130, 3000, 3000)).toBe(0);
  });

  test("zone update has no defaults", () => {
    expect(deliveryZoneUpdateSchema.parse({ charge: 0 })).toEqual({
      charge: 0,
    });
  });
});

describe("payment settings", () => {
  test("an empty row reads as complete defaults", () => {
    const s = paymentSettingsSchema.parse({});
    expect(s.cod.enabled).toBe(true);
    expect(s.codAdvanceDeliveryCharge).toBe(false);
    expect(walletAvailable(s.bkash)).toBe(false);
    expect(walletAvailable({ ...s.bkash, number: "01700000000" })).toBe(true);
  });
});
