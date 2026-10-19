import { describe, expect, test } from "bun:test";
import {
  type CouponRule,
  couponDiscount,
  couponInputSchema,
  couponUpdateSchema,
} from "./coupon.js";

const base: CouponRule = {
  type: "PERCENT",
  value: 10,
  minOrder: 0,
  maxDiscount: null,
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  usedCount: 0,
  perPhoneLimit: null,
  scope: "ALL",
  scopeIds: [],
  isActive: true,
};
const hoodie = { productId: "p1", categoryId: "hoodies", lineTotal: 2490 };
const panjabi = { productId: "p2", categoryId: "panjabi", lineTotal: 3200 };
const now = new Date("2026-11-02T00:00:00Z");

describe("couponDiscount", () => {
  test("percent of the subtotal, rounded down to whole taka", () => {
    expect(couponDiscount(base, [hoodie, panjabi], null, now)).toEqual({
      ok: true,
      discount: 569,
    });
  });

  test("percent is capped by maxDiscount", () => {
    const rule = { ...base, maxDiscount: 300 };
    expect(couponDiscount(rule, [hoodie, panjabi], null, now)).toEqual({
      ok: true,
      discount: 300,
    });
  });

  test("fixed never exceeds what it applies to", () => {
    const rule = { ...base, type: "FIXED" as const, value: 5000 };
    expect(couponDiscount(rule, [hoodie], null, now)).toEqual({
      ok: true,
      discount: 2490,
    });
  });

  test("scope limits the discount to matching lines", () => {
    const rule = { ...base, scope: "CATEGORY" as const, scopeIds: ["panjabi"] };
    expect(couponDiscount(rule, [hoodie, panjabi], null, now)).toEqual({
      ok: true,
      discount: 320,
    });
    const product = { ...base, scope: "PRODUCT" as const, scopeIds: ["p9"] };
    expect(couponDiscount(product, [hoodie], null, now)).toEqual({
      ok: false,
      code: "COUPON_NOT_APPLICABLE",
    });
  });

  test("minimum order is checked against the whole subtotal", () => {
    const rule = { ...base, minOrder: 3000 };
    expect(couponDiscount(rule, [hoodie], null, now)).toEqual({
      ok: false,
      code: "COUPON_MIN_ORDER",
    });
    expect(couponDiscount(rule, [hoodie, panjabi], null, now).ok).toBe(true);
  });

  test("dates: not started, expired at the end instant", () => {
    expect(
      couponDiscount(
        { ...base, startsAt: new Date("2026-11-03T00:00:00Z") },
        [hoodie],
        null,
        now,
      ),
    ).toEqual({ ok: false, code: "COUPON_NOT_STARTED" });
    expect(
      couponDiscount({ ...base, endsAt: now }, [hoodie], null, now),
    ).toEqual({ ok: false, code: "COUPON_EXPIRED" });
  });

  test("usage limits: total and per phone", () => {
    expect(
      couponDiscount(
        { ...base, usageLimit: 5, usedCount: 5 },
        [hoodie],
        null,
        now,
      ),
    ).toEqual({ ok: false, code: "COUPON_LIMIT_REACHED" });
    const perPhone = { ...base, perPhoneLimit: 1 };
    expect(couponDiscount(perPhone, [hoodie], 1, now)).toEqual({
      ok: false,
      code: "COUPON_LIMIT_REACHED",
    });
    // Phone not known yet: checked again when the order is placed.
    expect(couponDiscount(perPhone, [hoodie], null, now).ok).toBe(true);
  });

  test("inactive coupons are invalid", () => {
    expect(
      couponDiscount({ ...base, isActive: false }, [hoodie], 0, now),
    ).toEqual({ ok: false, code: "COUPON_INVALID" });
  });
});

describe("coupon schemas", () => {
  const valid = { code: " eid10 ", type: "PERCENT", value: 10 };

  test("codes are trimmed and upper-cased; defaults fill in", () => {
    const parsed = couponInputSchema.parse(valid);
    expect(parsed.code).toBe("EID10");
    expect(parsed.scope).toBe("ALL");
    expect(parsed.isActive).toBe(true);
  });

  test("cross-field rules", () => {
    expect(couponInputSchema.safeParse({ ...valid, value: 150 }).success).toBe(
      false,
    );
    expect(
      couponInputSchema.safeParse({ ...valid, scope: "CATEGORY" }).success,
    ).toBe(false);
    expect(
      couponInputSchema.safeParse({
        ...valid,
        startsAt: "2026-11-02T00:00:00+06:00",
        endsAt: "2026-11-01T00:00:00+06:00",
      }).success,
    ).toBe(false);
    expect(couponInputSchema.safeParse({ ...valid, code: "a b" }).success).toBe(
      false,
    );
  });

  test("update has no defaults, so PATCH never resets fields", () => {
    expect(couponUpdateSchema.parse({ value: 15 })).toEqual({ value: 15 });
  });
});
