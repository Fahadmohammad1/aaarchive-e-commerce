import { randomInt, randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import { createApp, createUser, ORIGIN, TEST_DB } from "./auth-helpers.js";

// Cart → coupon → order → tracking (PRD §5.6–5.9, §8.4; phases.md Phase 4
// tests). Each describe block starts its own app, so the per-IP order limit
// (10/hour, in-memory) is counted per block.

const PASSWORD = "marigold kantha 1971";
const DOMAIN = "checkout.aaarchive.test";
const STOCK = 7351; // distinctive, searched for in public bodies

/** A fresh, valid BD mobile number for each order. */
const phone = () => `017${String(randomInt(10_000_000, 99_999_999))}`;
/** A fresh TrxID. */
const trxId = () => randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();

function keys(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) for (const v of value) keys(v, out);
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      keys(v, out);
    }
  }
  return out;
}

type Fixture = {
  app: INestApplication<App>;
  owner: Awaited<ReturnType<typeof createUser>>;
  zoneId: string;
  /** One unit left. */
  lastUnit: string;
  /** Plenty of stock. */
  plenty: string;
  categoryId: string;
  restorePayments: () => Promise<void>;
  cleanup: () => Promise<void>;
};

async function setUp(): Promise<Fixture> {
  const run = randomUUID().slice(0, 8);
  const app = await createApp();
  const owner = await createUser(app, "OWNER", PASSWORD, DOMAIN);
  const db = owner.prisma;

  const category = await db.category.create({
    data: { name: `E2E ${run} Checkout`, slug: `e2e-${run}-checkout` },
  });
  const [m, l] = await Promise.all([
    db.size.create({ data: { name: `M${run.slice(0, 5)}` } }),
    db.size.create({ data: { name: `L${run.slice(0, 5)}` } }),
  ]);
  const color = await db.color.create({
    data: { name: `E2E ${run} Rust`, hex: "#B5532F" },
  });
  const product = await db.product.create({
    data: {
      name: `E2E ${run} Checkout Hoodie`,
      slug: `e2e-${run}-checkout-hoodie`,
      categoryId: category.id,
      basePrice: 2000,
      status: "PUBLISHED",
      variants: {
        create: [
          { sizeId: m.id, colorId: color.id, sku: `E2E-${run}-M`, stock: 1 },
          {
            sizeId: l.id,
            colorId: color.id,
            sku: `E2E-${run}-L`,
            stock: STOCK,
          },
        ],
      },
    },
    include: { variants: true },
  });
  const zone = await db.deliveryZone.create({
    data: { name: `E2E ${run} Zone`, charge: 70, estimatedDays: "1–2 days" },
  });

  // Wallets need a number to be offered; put the old row back afterwards.
  const before = await db.setting.findUnique({ where: { key: "payments" } });
  await db.setting.upsert({
    where: { key: "payments" },
    update: {
      value: {
        cod: { enabled: true },
        bkash: { enabled: true, number: "01700000001", instructions: "" },
        nagad: { enabled: true, number: "01800000001", instructions: "" },
        codAdvanceDeliveryCharge: false,
      },
    },
    create: {
      key: "payments",
      value: {
        bkash: { enabled: true, number: "01700000001" },
        nagad: { enabled: true, number: "01800000001" },
      },
    },
  });
  const restorePayments = async () => {
    if (before) {
      await db.setting.update({
        where: { key: "payments" },
        data: { value: before.value ?? {} },
      });
    } else {
      await db.setting.delete({ where: { key: "payments" } });
    }
  };

  const sku = (s: string) =>
    product.variants.find((v) => v.sku === `E2E-${run}-${s}`)?.id ?? "";

  return {
    app,
    owner,
    zoneId: zone.id,
    lastUnit: sku("M"),
    plenty: sku("L"),
    categoryId: category.id,
    restorePayments,
    cleanup: async () => {
      await db.order.deleteMany({ where: { zoneId: zone.id } });
      await db.coupon.deleteMany({
        where: { code: { startsWith: `E2E${run.slice(0, 6).toUpperCase()}` } },
      });
      await db.product.deleteMany({ where: { id: product.id } });
      await db.deliveryZone.deleteMany({ where: { id: zone.id } });
      await db.size.deleteMany({ where: { id: { in: [m.id, l.id] } } });
      await db.color.deleteMany({ where: { id: color.id } });
      await db.category.deleteMany({ where: { id: category.id } });
      await db.user.deleteMany({ where: { id: owner.id } });
      await restorePayments();
      await app.close();
    },
  };
}

function orderBody(f: Fixture, overrides: Record<string, unknown> = {}) {
  return {
    name: "Rahim Uddin",
    phone: phone(),
    zoneId: f.zoneId,
    district: "Dhaka",
    area: "Mirpur 10",
    address: "House 12, Road 4",
    payment: { method: "COD" },
    items: [{ variantId: f.plenty, quantity: 2 }],
    ...overrides,
  };
}

describe.skipIf(!TEST_DB)("placing orders (e2e, real database)", () => {
  let f: Fixture;
  const post = (path: string) =>
    request(f.app.getHttpServer()).post(`/api/v1${path}`).set("Origin", ORIGIN);

  beforeAll(async () => {
    f = await setUp();
  });
  afterAll(async () => {
    await f.cleanup();
  });

  it("prices on the server and ignores anything the client says about money", async () => {
    const tampered = await post("/orders").send(
      orderBody(f, {
        items: [{ variantId: f.plenty, quantity: 2, price: 1 }],
        total: 1,
      }),
    );
    expect(tampered.status).toBe(400);
    expect(tampered.body.code).toBe("VALIDATION_ERROR");

    const res = await post("/orders").send(orderBody(f));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: "PENDING",
      paymentMethod: "COD",
      paymentStatus: "UNPAID",
      subtotal: 4000,
      discount: 0,
      deliveryCharge: 70,
      total: 4070,
      payOnDelivery: 4070,
    });
    expect(res.body.orderNumber).toMatch(/^AAR-\d+$/);
    expect(res.body.phone).toMatch(/^017•+\d{2}$/);
    expect(keys(res.body).has("stock")).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain(String(STOCK));

    const variant = await f.owner.prisma.variant.findUnique({
      where: { id: f.plenty },
    });
    expect(variant?.stock).toBe(STOCK - 2);
  });

  it("sells the last unit once when two orders race for it", async () => {
    const body = () =>
      orderBody(f, { items: [{ variantId: f.lastUnit, quantity: 1 }] });
    const results = await Promise.all([
      post("/orders").send(body()),
      post("/orders").send(body()),
    ]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 422]);
    const refused = results.find((r) => r.status === 422);
    expect(refused?.body).toMatchObject({
      code: "OUT_OF_STOCK",
      message:
        "Not enough stock for this quantity. Please try a smaller amount.",
    });
    const variant = await f.owner.prisma.variant.findUnique({
      where: { id: f.lastUnit },
    });
    expect(variant?.stock).toBe(0);
  });

  it("refuses a TrxID that already paid for an order", async () => {
    const id = trxId();
    const payment = { method: "BKASH", senderNumber: phone(), trxId: id };
    const first = await post("/orders").send(orderBody(f, { payment }));
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({
      paymentStatus: "PENDING_VERIFICATION",
      walletPayment: { method: "BKASH", amount: 4070, status: "PENDING" },
      payOnDelivery: 0,
    });
    const again = await post("/orders").send(
      orderBody(f, { payment: { ...payment, trxId: id.toLowerCase() } }),
    );
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("TRXID_ALREADY_USED");
  });

  it("blocks COD for a blocklisted phone but lets it pay in advance", async () => {
    const blocked = phone();
    await f.owner.prisma.blockedPhone.create({
      data: { phone: blocked, reason: "e2e" },
    });
    try {
      const cod = await post("/orders").send(orderBody(f, { phone: blocked }));
      expect(cod.status).toBe(422);
      expect(cod.body.code).toBe("PHONE_BLOCKED");
      const nagad = await post("/orders").send(
        orderBody(f, {
          phone: blocked,
          payment: { method: "NAGAD", senderNumber: blocked, trxId: trxId() },
        }),
      );
      expect(nagad.status).toBe(201);
    } finally {
      await f.owner.prisma.blockedPhone.delete({ where: { phone: blocked } });
    }
  });

  it("tracks an order only with the matching phone", async () => {
    const customer = phone();
    const placed = await post("/orders").send(
      orderBody(f, { phone: customer }),
    );
    const number = placed.body.orderNumber as string;

    const wrong = await post("/orders/track").send({
      phone: phone(),
      orderNumber: number,
    });
    expect(wrong.status).toBe(404);
    expect(wrong.body.code).toBe("ORDER_NOT_FOUND");

    const ok = await post("/orders/track").send({
      phone: `+88${customer}`,
      orderNumber: number.toLowerCase(),
    });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({
      orderNumber: number,
      status: "PENDING",
      phone: `${customer.slice(0, 3)}••••••${customer.slice(-2)}`,
      timeline: [{ status: "PENDING" }],
    });
    expect(keys(ok.body).has("address")).toBe(false);
  });
});

describe.skipIf(!TEST_DB)(
  "limits, coupons and cart (e2e, real database)",
  () => {
    let f: Fixture;
    const post = (path: string) =>
      request(f.app.getHttpServer())
        .post(`/api/v1${path}`)
        .set("Origin", ORIGIN);

    beforeAll(async () => {
      f = await setUp();
    });
    afterAll(async () => {
      await f.cleanup();
    });

    it("allows three orders per phone per hour", async () => {
      const customer = phone();
      for (let n = 0; n < 3; n++) {
        const res = await post("/orders").send(
          orderBody(f, { phone: customer }),
        );
        expect(res.status).toBe(201);
      }
      const fourth = await post("/orders").send(
        orderBody(f, { phone: customer }),
      );
      expect(fourth.status).toBe(429);
      expect(fourth.body.code).toBe("RATE_LIMITED");
    });

    it("applies a coupon on the server and enforces its usage limit", async () => {
      const zone = await f.owner.prisma.deliveryZone.findUnique({
        where: { id: f.zoneId },
      });
      const prefix = `E2E${zone?.name.slice(4, 10).toUpperCase()}`;
      const code = `${prefix}TEN`;
      await f.owner.prisma.coupon.create({
        data: {
          code,
          type: "PERCENT",
          value: 10,
          maxDiscount: 300,
          usageLimit: 1,
          scope: "CATEGORY",
          scopeIds: [f.categoryId],
        },
      });
      const items = [{ variantId: f.plenty, quantity: 2 }];

      const apply = await post("/coupons/apply").send({
        code: code.toLowerCase(),
        items,
      });
      expect(apply.status).toBe(200);
      expect(apply.body).toMatchObject({ code, discount: 300, subtotal: 4000 });

      const unknown = await post("/coupons/apply").send({
        code: `${prefix}NOPE`,
        items,
      });
      expect(unknown.status).toBe(422);
      expect(unknown.body.code).toBe("COUPON_INVALID");

      const order = await post("/orders").send(
        orderBody(f, { couponCode: code }),
      );
      expect(order.status).toBe(201);
      expect(order.body).toMatchObject({
        discount: 300,
        total: 4000 - 300 + 70,
        couponCode: code,
      });

      const second = await post("/orders").send(
        orderBody(f, { couponCode: code }),
      );
      expect(second.status).toBe(422);
      expect(second.body.code).toBe("COUPON_LIMIT_REACHED");
    });

    it("validates a cart with notices and no stock numbers", async () => {
      const res = await post("/cart/validate").send({
        items: [
          { variantId: f.plenty, quantity: 9 },
          { variantId: "gone-variant", quantity: 1 },
        ],
      });
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        variantId: f.plenty,
        quantity: 5,
        unitPrice: 2000,
        lineTotal: 10_000,
        stockStatus: "in_stock",
      });
      expect(res.body.notices).toEqual(
        expect.arrayContaining([
          { variantId: "gone-variant", code: "UNAVAILABLE" },
          { variantId: f.plenty, code: "QTY_LIMITED" },
        ]),
      );
      expect(keys(res.body).has("stock")).toBe(false);
      expect(JSON.stringify(res.body)).not.toContain(String(STOCK));
    });

    it("refuses more than the per-variant maximum at checkout", async () => {
      const res = await post("/orders").send(
        orderBody(f, { items: [{ variantId: f.plenty, quantity: 6 }] }),
      );
      expect(res.status).toBe(422);
      expect(res.body.code).toBe("QTY_LIMIT");
    });
  },
);
