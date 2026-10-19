import { randomInt, randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import {
  createApp,
  createUser,
  ORIGIN,
  PARALLEL_DB,
  TEST_DB,
} from "./auth-helpers.js";

// Order management (PRD §6.4, §6.5, §6.1; phases.md Phase 5 tests): status
// flow, stock restore, payment checks, edits, customers, blocklist, reports.
// Everything runs as STAFF: the Order Manager role exists for this.

const PASSWORD = "marigold kantha 1971";
const DOMAIN = "orders.aaarchive.test";
const START = 50;

const phone = () => `018${String(randomInt(10_000_000, 99_999_999))}`;
const trxId = () => randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();

describe.skipIf(!TEST_DB)("order management (e2e, real database)", () => {
  let app: INestApplication<App>;
  let owner: Awaited<ReturnType<typeof createUser>>;
  const userIds: string[] = [];
  let staffToken: string;
  let customerToken: string;
  let zoneId: string;
  let variantId: string;
  let otherVariantId: string;
  const run = randomUUID().slice(0, 8);
  let restorePayments: () => Promise<void>;

  const db = () => owner.prisma;
  const stockOf = async (id: string) =>
    (await db().variant.findUniqueOrThrow({ where: { id } })).stock;

  const admin = (
    method: "get" | "post" | "patch" | "put" | "delete",
    path: string,
    token = staffToken,
  ) =>
    request(app.getHttpServer())
      [method](`/api/v1${path}`)
      .set("Origin", ORIGIN)
      .set("Authorization", `Bearer ${token}`);

  const signIn = async (email: string) => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .set("Origin", ORIGIN)
      .send({ email, password: PASSWORD });
    return res.body.accessToken as string;
  };

  /** Places a public order and returns its id. */
  const place = async (overrides: Record<string, unknown> = {}) => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/orders")
      .set("Origin", ORIGIN)
      .send({
        name: "Karim Ahmed",
        phone: phone(),
        zoneId,
        district: "Dhaka",
        area: "Dhanmondi",
        address: "Road 27, House 5",
        payment: { method: "COD" },
        items: [{ variantId, quantity: 2 }],
        ...overrides,
      });
    expect(res.status).toBe(201);
    const order = await db().order.findUniqueOrThrow({
      where: { orderNumber: res.body.orderNumber },
    });
    return order.id;
  };

  const move = (id: string, body: Record<string, unknown>) =>
    admin("patch", `/admin/orders/${id}/status`).send(body);

  beforeAll(async () => {
    app = await createApp();
    owner = await createUser(app, "OWNER", PASSWORD, DOMAIN);
    const staff = await createUser(app, "STAFF", PASSWORD, DOMAIN);
    const customer = await createUser(app, "CUSTOMER", PASSWORD, DOMAIN);
    userIds.push(owner.id, staff.id, customer.id);
    staffToken = await signIn(staff.email);
    customerToken = await signIn(customer.email);

    const category = await db().category.create({
      data: { name: `E2E ${run} Orders`, slug: `e2e-${run}-orders` },
    });
    const [m, l] = await Promise.all([
      db().size.create({ data: { name: `O${run.slice(0, 5)}` } }),
      db().size.create({ data: { name: `P${run.slice(0, 5)}` } }),
    ]);
    const color = await db().color.create({
      data: { name: `E2E ${run} Olive`, hex: "#556B2F" },
    });
    const product = await db().product.create({
      data: {
        name: `E2E ${run} Panjabi`,
        slug: `e2e-${run}-panjabi`,
        categoryId: category.id,
        basePrice: 3000,
        status: "PUBLISHED",
        variants: {
          create: [
            {
              sizeId: m.id,
              colorId: color.id,
              sku: `E2E-${run}-O`,
              stock: START,
            },
            {
              sizeId: l.id,
              colorId: color.id,
              sku: `E2E-${run}-P`,
              stock: START,
            },
          ],
        },
      },
      include: { variants: { orderBy: { sku: "asc" } } },
    });
    variantId = product.variants[0].id;
    otherVariantId = product.variants[1].id;
    const zone = await db().deliveryZone.create({
      data: { name: `E2E ${run} Zone`, charge: 100, estimatedDays: "2 days" },
    });
    zoneId = zone.id;

    const before = await db().setting.findUnique({
      where: { key: "payments" },
    });
    const value = {
      cod: { enabled: true },
      bkash: { enabled: true, number: "01700000002", instructions: "" },
      nagad: { enabled: true, number: "01800000002", instructions: "" },
      codAdvanceDeliveryCharge: false,
    };
    await db().setting.upsert({
      where: { key: "payments" },
      update: { value },
      create: { key: "payments", value },
    });
    restorePayments = async () => {
      if (before) {
        await db().setting.update({
          where: { key: "payments" },
          data: { value: before.value ?? {} },
        });
      } else {
        await db().setting.delete({ where: { key: "payments" } });
      }
    };

    // Cleanup handles
    afterAllCleanup = async () => {
      await db().order.deleteMany({ where: { zoneId } });
      await db().product.deleteMany({ where: { id: product.id } });
      await db().deliveryZone.deleteMany({ where: { id: zoneId } });
      await db().size.deleteMany({ where: { id: { in: [m.id, l.id] } } });
      await db().color.deleteMany({ where: { id: color.id } });
      await db().category.deleteMany({ where: { id: category.id } });
    };
  });

  let afterAllCleanup = async () => {};
  afterAll(async () => {
    await afterAllCleanup();
    await db().blockedPhone.deleteMany({ where: { reason: `e2e ${run}` } });
    await db().user.deleteMany({ where: { id: { in: userIds } } });
    await restorePayments();
    await app.close();
  });

  it("walks Pending → Delivered; COD becomes paid; every step is an event", async () => {
    const id = await place();
    expect(
      (
        await move(id, {
          to: "SHIPPED",
          courierName: "Pathao",
          trackingNumber: "P1",
        })
      ).body.code,
    ).toBe("INVALID_TRANSITION");
    for (const to of ["CONFIRMED", "PROCESSING"]) {
      const res = await move(id, { to });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(to);
    }
    const noCourier = await move(id, { to: "SHIPPED" });
    expect(noCourier.status).toBe(400);
    const shipped = await move(id, {
      to: "SHIPPED",
      courierName: "Steadfast",
      trackingNumber: "SF-123",
    });
    expect(shipped.body).toMatchObject({
      status: "SHIPPED",
      courierName: "Steadfast",
      trackingNumber: "SF-123",
      nextStatuses: ["DELIVERED", "CANCELLED", "RETURNED"],
      editable: false,
    });
    const delivered = await move(id, { to: "DELIVERED", note: "Handed over" });
    expect(delivered.body).toMatchObject({
      status: "DELIVERED",
      paymentStatus: "PAID",
      nextStatuses: [],
    });
    const statusEvents = delivered.body.events.filter(
      (e: { type: string }) => e.type === "STATUS",
    );
    expect(statusEvents.map((e: { to: string }) => e.to)).toEqual([
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
    ]);
    expect(statusEvents[1].by).toBe("Test STAFF");
    expect((await move(id, { to: "CANCELLED" })).status).toBe(409);
  });

  it("restores stock when cancelled or returned, exactly once", async () => {
    const before = await stockOf(variantId);
    const id = await place();
    expect(await stockOf(variantId)).toBe(before - 2);
    expect(
      (await move(id, { to: "CANCELLED", note: "Customer changed mind" }))
        .status,
    ).toBe(200);
    expect(await stockOf(variantId)).toBe(before);
    expect((await move(id, { to: "CANCELLED" })).status).toBe(409);
    expect(await stockOf(variantId)).toBe(before);

    const returned = await place();
    await move(returned, { to: "CONFIRMED" });
    await move(returned, { to: "PROCESSING" });
    await move(returned, {
      to: "SHIPPED",
      courierName: "RedX",
      trackingNumber: "R9",
    });
    expect(await stockOf(variantId)).toBe(before - 2);
    expect((await move(returned, { to: "RETURNED" })).status).toBe(200);
    expect(await stockOf(variantId)).toBe(before);
  });

  it.runIf(PARALLEL_DB)(
    "lets only one of two simultaneous changes through",
    async () => {
      const id = await place();
      const before = await stockOf(variantId);
      const results = await Promise.all([
        move(id, { to: "CANCELLED" }),
        move(id, { to: "CANCELLED" }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(await stockOf(variantId)).toBe(before + 2);
    },
  );

  it("verifies and rejects bKash/Nagad payments once", async () => {
    const paid = await place({
      payment: { method: "BKASH", senderNumber: phone(), trxId: trxId() },
    });
    const payment = await db().payment.findFirstOrThrow({
      where: { orderId: paid },
    });
    const pending = await admin("get", "/admin/payments?status=PENDING");
    expect(
      pending.body.data.some((p: { id: string }) => p.id === payment.id),
    ).toBe(true);

    const ok = await admin("post", `/admin/payments/${payment.id}/verify`).send(
      {},
    );
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({
      status: "VERIFIED",
      verifiedBy: "Test STAFF",
    });
    expect(
      (await admin("get", `/admin/orders/${paid}`)).body.paymentStatus,
    ).toBe("PAID");
    const again = await admin(
      "post",
      `/admin/payments/${payment.id}/verify`,
    ).send({});
    expect(again.body.code).toBe("PAYMENT_ALREADY_DECIDED");

    const bad = await place({
      payment: { method: "NAGAD", senderNumber: phone(), trxId: trxId() },
    });
    const badPayment = await db().payment.findFirstOrThrow({
      where: { orderId: bad },
    });
    expect(
      (await admin("post", `/admin/payments/${badPayment.id}/reject`).send({}))
        .status,
    ).toBe(400);
    const rejected = await admin(
      "post",
      `/admin/payments/${badPayment.id}/reject`,
    ).send({
      note: "TrxID not found in the statement",
    });
    expect(rejected.body.status).toBe("REJECTED");
    const order = await admin("get", `/admin/orders/${bad}`);
    expect(order.body.paymentStatus).toBe("UNPAID");
    expect(order.body.events.at(-1)).toMatchObject({
      type: "PAYMENT",
      from: "PENDING_VERIFICATION",
      to: "UNPAID",
      note: "TrxID not found in the statement",
    });
  });

  it("edits before shipping and moves stock by the difference", async () => {
    const id = await place();
    const a = await stockOf(variantId);
    const b = await stockOf(otherVariantId);
    const res = await admin("patch", `/admin/orders/${id}`).send({
      items: [
        { variantId, quantity: 1 },
        { variantId: otherVariantId, quantity: 3 },
      ],
      address: "Road 28, House 9",
      deliveryCharge: 60,
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      subtotal: 4 * 3000,
      deliveryCharge: 60,
      total: 12_060,
      address: "Road 28, House 9",
    });
    expect(await stockOf(variantId)).toBe(a + 1);
    expect(await stockOf(otherVariantId)).toBe(b - 3);
    expect(res.body.events.at(-1)).toMatchObject({ type: "EDIT" });

    const tooMany = await admin("patch", `/admin/orders/${id}`).send({
      items: [{ variantId: otherVariantId, quantity: 99 }],
    });
    expect(tooMany.body.code).toBe("OUT_OF_STOCK");
    expect(await stockOf(otherVariantId)).toBe(b - 3);

    await move(id, { to: "CONFIRMED" });
    await move(id, { to: "PROCESSING" });
    await move(id, {
      to: "SHIPPED",
      courierName: "Pathao",
      trackingNumber: "X",
    });
    const late = await admin("patch", `/admin/orders/${id}`).send({
      address: "Elsewhere 1",
    });
    expect(late.body.code).toBe("ORDER_NOT_EDITABLE");
  });

  it("records notes and call attempts", async () => {
    const id = await place();
    await admin("post", `/admin/orders/${id}/notes`).send({
      type: "CALL",
      outcome: "NO_ANSWER",
    });
    const res = await admin("post", `/admin/orders/${id}/notes`).send({
      type: "NOTE",
      note: "Wants delivery after 5pm",
    });
    expect(res.body.events.slice(-2)).toMatchObject([
      { type: "CALL", to: "NO_ANSWER" },
      { type: "NOTE", note: "Wants delivery after 5pm" },
    ]);
  });

  it("lists customers by phone and blocks COD for a blocked number", async () => {
    const number = phone();
    const first = await place({ phone: number });
    await move(first, { to: "CANCELLED" });
    const block = await admin("post", "/admin/blocked-phones").send({
      phone: `+88${number}`,
      reason: `e2e ${run}`,
    });
    expect(block.status).toBe(201);
    expect(
      (
        await admin("post", "/admin/blocked-phones").send({
          phone: number,
          reason: `e2e ${run}`,
        })
      ).body.code,
    ).toBe("PHONE_ALREADY_BLOCKED");

    const cod = await request(app.getHttpServer())
      .post("/api/v1/orders")
      .set("Origin", ORIGIN)
      .send({
        name: "Karim Ahmed",
        phone: number,
        zoneId,
        district: "Dhaka",
        area: "Dhanmondi",
        address: "Road 27, House 5",
        payment: { method: "COD" },
        items: [{ variantId, quantity: 1 }],
      });
    expect(cod.body.code).toBe("PHONE_BLOCKED");

    const list = await admin("get", `/admin/customers?q=${number}`);
    expect(list.body.data[0]).toMatchObject({
      phone: number,
      orders: 1,
      delivered: 0,
      cancelledOrReturned: 1,
      successRate: 0,
      blocked: true,
    });
    const detail = await admin("get", `/admin/customers/${number}`);
    expect(detail.body).toMatchObject({
      phone: number,
      block: { reason: `e2e ${run}` },
    });
    expect(detail.body.orders).toHaveLength(1);
  });

  it("reports the dashboard numbers", async () => {
    const res = await admin("get", "/admin/reports/summary");
    expect(res.status).toBe(200);
    expect(res.body.today.orders).toBeGreaterThan(0);
    expect(
      res.body.byStatus.map((s: { status: string }) => s.status),
    ).toContain("DELIVERED");
    expect(typeof res.body.paymentsAwaiting).toBe("number");
    expect(Array.isArray(res.body.lowStock)).toBe(true);
    expect(
      res.body.bestSellers.some(
        (b: { productName: string }) => b.productName === `E2E ${run} Panjabi`,
      ),
    ).toBe(true);
  });

  it("lets the owner set couriers and shows customers the tracking link", async () => {
    const ownerToken = await signIn(owner.email);
    const before = await db().setting.findUnique({
      where: { key: "couriers" },
    });
    try {
      const couriers = {
        couriers: [
          {
            name: `Swift ${run}`,
            trackingUrl: "https://track.example/p/{tracking}",
          },
          { name: `Slow ${run}` },
        ],
      };
      expect(
        (await admin("put", "/admin/settings/couriers").send(couriers)).status,
      ).toBe(403);
      const bad = await admin(
        "put",
        "/admin/settings/couriers",
        ownerToken,
      ).send({
        couriers: [{ name: "X", trackingUrl: "http://no-placeholder.example" }],
      });
      expect(bad.status).toBe(400);
      const saved = await admin(
        "put",
        "/admin/settings/couriers",
        ownerToken,
      ).send(couriers);
      expect(saved.status).toBe(200);
      expect(
        (await admin("get", "/admin/settings/couriers")).body.couriers,
      ).toHaveLength(2);

      const number = phone();
      const id = await place({ phone: number });
      await move(id, { to: "CONFIRMED" });
      await move(id, { to: "PROCESSING" });
      await move(id, {
        to: "SHIPPED",
        courierName: `swift ${run}`,
        trackingNumber: "AB 12",
      });
      const order = await db().order.findUniqueOrThrow({ where: { id } });
      const tracked = await request(app.getHttpServer())
        .post("/api/v1/orders/track")
        .set("Origin", ORIGIN)
        .send({ phone: number, orderNumber: order.orderNumber });
      expect(tracked.body.courier).toEqual({
        name: `swift ${run}`,
        trackingNumber: "AB 12",
        trackingUrl: "https://track.example/p/AB%2012",
      });
    } finally {
      if (before) {
        await db().setting.update({
          where: { key: "couriers" },
          data: { value: before.value ?? {} },
        });
      } else {
        await db().setting.deleteMany({ where: { key: "couriers" } });
      }
    }
  });

  it("keeps customers out of every admin order route", async () => {
    for (const path of [
      "/admin/orders",
      "/admin/payments",
      "/admin/customers",
      "/admin/reports/summary",
    ]) {
      expect((await admin("get", path, customerToken)).status).toBe(403);
    }
  });
});
