import { randomInt, randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import { createApp, createUser, ORIGIN, TEST_DB } from "./auth-helpers.js";

// Customer accounts (PRD §5.10) and SSLCommerz online payment (owner,
// 2026-10-21) against a real database. SSLCommerz's HTTP calls are stubbed on
// the client instance; everything that changes orders runs for real.

const PASSWORD = "marigold kantha 1971";
const DOMAIN = "account.aaarchive.test";
const phone = () => `018${String(randomInt(10_000_000, 99_999_999))}`;

type Prisma = Awaited<ReturnType<typeof createUser>>["prisma"];

function cookies(setCookie: string[] | string | undefined): string[] {
  return Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
}
function cookiePair(setCookie: string[] | string | undefined, name: string) {
  const found = cookies(setCookie).find((c) => c.startsWith(`${name}=`));
  return found?.split(";")[0];
}

describe.skipIf(!TEST_DB)("customer accounts (e2e, real database)", () => {
  let app: INestApplication<App>;
  let db: Prisma;
  let owner: Awaited<ReturnType<typeof createUser>>;
  let zoneId: string;
  let variantId: string;
  const run = randomUUID().slice(0, 8);
  const http = () => request(app.getHttpServer());
  const post = (path: string, token?: string) => {
    const req = http().post(`/api/v1${path}`).set("Origin", ORIGIN);
    return token ? req.set("Authorization", `Bearer ${token}`) : req;
  };
  const get = (path: string, token: string) =>
    http().get(`/api/v1${path}`).set("Authorization", `Bearer ${token}`);
  const email = (name: string) => `${name}-${run}@${DOMAIN}`;
  const orderBody = (overrides: Record<string, unknown> = {}) => ({
    name: "Rahim Uddin",
    phone: phone(),
    zoneId,
    district: "Dhaka",
    area: "Mirpur 10",
    address: "House 12, Road 4",
    payment: { method: "COD" },
    items: [{ variantId, quantity: 1 }],
    ...overrides,
  });
  /**
   * A signed-in customer. Made directly (not through POST /register): every
   * test request comes from one IP, and sign-up allows 5 per IP per hour.
   */
  async function register(name: string) {
    const { hash } = await import("@node-rs/argon2");
    const { AuthService } = await import("../src/modules/auth/auth.service.js");
    const user = await db.user.create({
      data: {
        name: "Rafi Ahmed",
        email: email(name),
        role: "CUSTOMER",
        passwordHash: await hash(PASSWORD),
      },
    });
    const { session } = await app.get(AuthService).startSession(user);
    return { token: session.accessToken, userId: user.id };
  }

  beforeAll(async () => {
    app = await createApp();
    owner = await createUser(app, "OWNER", PASSWORD, DOMAIN);
    db = owner.prisma;
    const category = await db.category.create({
      data: { name: `E2E ${run} Account`, slug: `e2e-${run}-account` },
    });
    const size = await db.size.create({
      data: { name: `A${run.slice(0, 5)}` },
    });
    const color = await db.color.create({
      data: { name: `E2E ${run} Ink`, hex: "#111111" },
    });
    const product = await db.product.create({
      data: {
        name: `E2E ${run} Account Tee`,
        slug: `e2e-${run}-account-tee`,
        categoryId: category.id,
        basePrice: 1000,
        status: "PUBLISHED",
        variants: {
          create: [
            {
              sizeId: size.id,
              colorId: color.id,
              sku: `E2E-${run}-A`,
              stock: 500,
            },
          ],
        },
      },
      include: { variants: true },
    });
    variantId = product.variants[0]?.id ?? "";
    const zone = await db.deliveryZone.create({
      data: { name: `E2E ${run} Zone`, charge: 60, estimatedDays: "1–2 days" },
    });
    zoneId = zone.id;
  });

  afterAll(async () => {
    await db.order.deleteMany({ where: { zoneId } });
    await db.address.deleteMany({ where: { zoneId } });
    await db.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
    await db.product.deleteMany({ where: { slug: `e2e-${run}-account-tee` } });
    await db.deliveryZone.deleteMany({ where: { id: zoneId } });
    await db.size.deleteMany({ where: { name: `A${run.slice(0, 5)}` } });
    await db.color.deleteMany({ where: { name: `E2E ${run} Ink` } });
    await db.category.deleteMany({ where: { slug: `e2e-${run}-account` } });
    await app.close();
  });

  it("registers with a separate customer session cookie", async () => {
    const res = await post("/account/auth/register").send({
      name: "Rafi Ahmed",
      email: email("signup"),
      password: PASSWORD,
    });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ role: "CUSTOMER" });
    const refresh = cookies(res.headers["set-cookie"]).find((c) =>
      c.startsWith("aar_crt="),
    );
    expect(refresh).toContain("Path=/api/v1/account/auth");
    expect(refresh).toContain("HttpOnly");
    // The dashboard's cookie is never set by customer sign-in.
    expect(cookiePair(res.headers["set-cookie"], "aar_rt")).toBeUndefined();

    const again = await post("/account/auth/register").send({
      name: "Someone",
      email: email("signup"),
      password: PASSWORD,
    });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe("EMAIL_TAKEN");

    const weak = await post("/account/auth/register").send({
      name: "Someone",
      email: email("weak"),
      password: "password123",
    });
    expect(weak.status).toBe(400);
  });

  it("keeps customer and dashboard doors and routes apart", async () => {
    const { token } = await register("doors");
    // A customer cannot sign in to the dashboard, nor staff to the shop.
    const atDashboard = await post("/auth/login").send({
      email: email("doors"),
      password: PASSWORD,
    });
    expect(atDashboard.status).toBe(401);
    expect(atDashboard.body.code).toBe("INVALID_CREDENTIALS");
    const staffAtShop = await post("/account/auth/login").send({
      email: owner.email,
      password: PASSWORD,
    });
    expect(staffAtShop.status).toBe(401);
    expect(staffAtShop.body.code).toBe("INVALID_CREDENTIALS");

    expect((await get("/admin/orders", token)).status).toBe(403);
    expect((await get("/auth/totp", token)).status).toBe(403);

    const staff = await post("/auth/login").send({
      email: owner.email,
      password: PASSWORD,
    });
    expect((await get("/account/me", staff.body.accessToken)).status).toBe(403);
  });

  it("refreshes with the customer cookie only", async () => {
    const login = await post("/account/auth/login").send({
      email: email("signup"),
      password: PASSWORD,
    });
    expect(login.status).toBe(200);
    const pair = cookiePair(login.headers["set-cookie"], "aar_crt");
    expect(pair).toBeDefined();
    const refreshed = await post("/account/auth/refresh").set(
      "Cookie",
      pair ?? "",
    );
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.user.role).toBe("CUSTOMER");
    // The same token at the dashboard's refresh is refused.
    const asStaff = await post("/auth/refresh").set(
      "Cookie",
      (cookiePair(refreshed.headers["set-cookie"], "aar_crt") ?? "").replace(
        "aar_crt=",
        "aar_rt=",
      ),
    );
    expect(asStaff.status).toBe(401);
  });

  it("links a signed-in checkout to the account and saves the address", async () => {
    const { token } = await register("checkout");
    const body = orderBody({ saveAddress: true });
    const placed = await post("/orders", token).send(body);
    expect(placed.status).toBe(201);
    // The address is saved after the order commits (not awaited by the
    // request); let it finish first — local PGlite serves one connection.
    await new Promise((r) => setTimeout(r, 300));
    const guest = await post("/orders").send(orderBody());
    expect(guest.status).toBe(201);

    const list = await get("/account/orders", token);
    expect(list.status).toBe(200);
    expect(
      list.body.data.map((o: { orderNumber: string }) => o.orderNumber),
    ).toEqual([placed.body.orderNumber]);
    const detail = await get(
      `/account/orders/${placed.body.orderNumber}`,
      token,
    );
    expect(detail.status).toBe(200);
    expect(detail.body.phone).toMatch(/•/);
    expect(
      (await get(`/account/orders/${guest.body.orderNumber}`, token)).status,
    ).toBe(404);

    const addresses = await get("/account/addresses", token);
    expect(addresses.body).toHaveLength(1);
    expect(addresses.body[0]).toMatchObject({
      phone: body.phone,
      isDefault: true,
    });
  });

  it("claims a guest order only with phone + order number", async () => {
    const { token } = await register("claim");
    const other = await register("claim-other");
    const body = orderBody();
    const guest = await post("/orders").send(body);

    const wrongPhone = await post("/account/orders/claim", token).send({
      phone: phone(),
      orderNumber: guest.body.orderNumber,
    });
    expect(wrongPhone.status).toBe(404);
    const claimed = await post("/account/orders/claim", token).send({
      phone: body.phone,
      orderNumber: guest.body.orderNumber,
    });
    expect(claimed.status).toBe(200);
    expect(claimed.body.orderNumber).toBe(guest.body.orderNumber);
    // Already in an account: answers like a wrong number.
    const stolen = await post("/account/orders/claim", other.token).send({
      phone: body.phone,
      orderNumber: guest.body.orderNumber,
    });
    expect(stolen.status).toBe(404);
    expect(stolen.body.code).toBe("ORDER_NOT_FOUND");
  });

  it("links guest orders by email only once the email is verified", async () => {
    const address = email("verify");
    const guest = await post("/orders").send(orderBody({ email: address }));
    expect(guest.status).toBe(201);
    const { token, userId } = await register("verify");
    expect((await get("/account/orders", token)).body.data).toHaveLength(0);

    const { AccountTokensService } = await import(
      "../src/modules/account/account-tokens.service.js"
    );
    const raw = await app
      .get(AccountTokensService)
      .issue(userId, "VERIFY_EMAIL", 60_000);
    expect(
      (await post("/account/auth/verify-email").send({ token: raw })).status,
    ).toBe(204);
    // A link works once.
    expect(
      (await post("/account/auth/verify-email").send({ token: raw })).status,
    ).toBe(400);
    const list = await get("/account/orders", token);
    expect(list.body.data[0]?.orderNumber).toBe(guest.body.orderNumber);
    expect((await get("/account/me", token)).body.emailVerified).toBe(true);
  });

  it("resets a password with a one-time link and ends old sessions", async () => {
    const unknown = await post("/account/auth/forgot-password").send({
      email: email("nobody"),
    });
    expect(unknown.status).toBe(204);

    const { token, userId } = await register("reset");
    const { AccountTokensService } = await import(
      "../src/modules/account/account-tokens.service.js"
    );
    const raw = await app
      .get(AccountTokensService)
      .issue(userId, "RESET_PASSWORD", 60_000);
    const weak = await post("/account/auth/reset-password").send({
      token: raw,
      password: "password123",
    });
    expect(weak.status).toBe(400);
    // A weak attempt does not use the link up.
    const ok = await post("/account/auth/reset-password").send({
      token: raw,
      password: "a brand new kantha 2026",
    });
    expect(ok.status).toBe(204);
    expect((await get("/account/me", token)).status).toBe(401);
    const login = await post("/account/auth/login").send({
      email: email("reset"),
      password: "a brand new kantha 2026",
    });
    expect(login.status).toBe(200);
  });

  it("keeps addresses private and one default at a time", async () => {
    const { token } = await register("addresses");
    const other = await register("addresses-other");
    const input = {
      name: "Rafi Ahmed",
      phone: "01712345678",
      zoneId,
      district: "Dhaka",
      area: "Mirpur",
      address: "House 1, Road 2",
    };
    const first = await post("/account/addresses", token).send(input);
    expect(first.status).toBe(201);
    expect(first.body.isDefault).toBe(true);
    const second = await post("/account/addresses", token).send({
      ...input,
      area: "Uttara",
      isDefault: true,
    });
    const list = await get("/account/addresses", token);
    expect(list.body.map((a: { isDefault: boolean }) => a.isDefault)).toEqual([
      true,
      false,
    ]);
    expect(list.body[0].id).toBe(second.body.id);

    const theirs = await http()
      .put(`/api/v1/account/addresses/${first.body.id}`)
      .set("Origin", ORIGIN)
      .set("Authorization", `Bearer ${other.token}`)
      .send(input);
    expect(theirs.status).toBe(404);
    const removed = await http()
      .delete(`/api/v1/account/addresses/${second.body.id}`)
      .set("Origin", ORIGIN)
      .set("Authorization", `Bearer ${token}`);
    expect(removed.status).toBe(204);
    const after = await get("/account/addresses", token);
    expect(after.body).toHaveLength(1);
    expect(after.body[0].isDefault).toBe(true);
  });

  describe("SSLCommerz online payment", () => {
    type Stub = {
      configured: boolean;
      createSession: () => Promise<string>;
      validate: (valId: string) => Promise<Record<string, unknown>>;
      findByTranId: (tranId: string) => Promise<Record<string, unknown>>;
    };
    let client: Stub;
    const answers = new Map<string, Record<string, unknown>>();
    let paymentsBefore: unknown;

    const enable = (on: boolean) =>
      db.setting.upsert({
        where: { key: "payments" },
        update: { value: { sslcommerz: { enabled: on } } },
        create: { key: "payments", value: { sslcommerz: { enabled: on } } },
      });

    beforeAll(async () => {
      const { SslcommerzClient } = await import(
        "../src/modules/sslcommerz/sslcommerz.client.js"
      );
      client = app.get(SslcommerzClient) as unknown as Stub;
      paymentsBefore = (
        await db.setting.findUnique({ where: { key: "payments" } })
      )?.value;
    });
    afterAll(async () => {
      if (paymentsBefore === undefined)
        await db.setting.deleteMany({ where: { key: "payments" } });
      else
        await db.setting.update({
          where: { key: "payments" },
          data: { value: paymentsBefore as object },
        });
    });

    it("cannot be switched on or used without credentials", async () => {
      const staff = await post("/auth/login").send({
        email: owner.email,
        password: PASSWORD,
      });
      const save = await http()
        .put("/api/v1/admin/settings/payments")
        .set("Origin", ORIGIN)
        .set("Authorization", `Bearer ${staff.body.accessToken}`)
        .send({ value: { sslcommerz: { enabled: true } } });
      expect(save.status).toBe(400);
      expect(save.body.code).toBe("SSLCOMMERZ_NOT_CONFIGURED");

      await enable(true);
      const order = await post("/orders").send(
        orderBody({ payment: { method: "SSLCOMMERZ" } }),
      );
      expect(order.status).toBe(422);
      expect(order.body.code).toBe("PAYMENT_METHOD_UNAVAILABLE");
    });

    it("marks the order paid only after SSLCommerz validates the payment", async () => {
      Object.defineProperty(client, "configured", { value: true });
      client.createSession = async () => "https://sandbox.example/pay/1";
      client.validate = async (valId) => answers.get(valId) ?? {};
      await enable(true);

      const stockBefore =
        (await db.variant.findUnique({ where: { id: variantId } }))?.stock ?? 0;
      const placed = await post("/orders").send(
        orderBody({ payment: { method: "SSLCOMMERZ" } }),
      );
      expect(placed.status).toBe(201);
      expect(placed.body.paymentUrl).toBe("https://sandbox.example/pay/1");
      expect(placed.body.paymentStatus).toBe("UNPAID");
      expect(
        (await db.variant.findUnique({ where: { id: variantId } }))?.stock,
      ).toBe(stockBefore - 1);
      const payment = await db.payment.findFirstOrThrow({
        where: { order: { orderNumber: placed.body.orderNumber } },
      });

      // A forged success (wrong amount) changes nothing.
      answers.set("forged", {
        status: "VALID",
        tran_id: payment.id,
        amount: "1.00",
        currency_type: "BDT",
      });
      const forged = await post("/payments/sslcommerz/success")
        .type("form")
        .send({ val_id: "forged", tran_id: payment.id });
      expect(forged.status).toBe(303);
      expect(forged.headers.location).toBe(`${ORIGIN}/checkout?payment=failed`);

      answers.set("good", {
        status: "VALID",
        tran_id: payment.id,
        amount: `${placed.body.total}.00`,
        currency_type: "BDT",
        risk_level: "0",
        card_type: "BKASH-BKash",
        bank_tran_id: "B123",
      });
      const ok = await post("/payments/sslcommerz/success")
        .type("form")
        .send({ val_id: "good", tran_id: payment.id });
      expect(ok.status).toBe(303);
      expect(ok.headers.location).toBe(
        `${ORIGIN}/order/success/${placed.body.orderNumber}?payment=paid`,
      );
      // The IPN arriving too records nothing twice.
      expect(
        (
          await post("/payments/sslcommerz/ipn")
            .type("form")
            .send({ val_id: "good" })
        ).status,
      ).toBe(200);
      const order = await db.order.findUniqueOrThrow({
        where: { orderNumber: placed.body.orderNumber },
        include: { payments: true, events: true },
      });
      expect(order.paymentStatus).toBe("PAID");
      expect(order.payments[0]).toMatchObject({
        status: "VERIFIED",
        gatewayValId: "good",
      });
      expect(order.events.filter((e) => e.type === "PAYMENT")).toHaveLength(1);
    });

    it("cancels and restocks when the payment fails, after asking SSLCommerz", async () => {
      client.findByTranId = async () => ({
        element: [{ status: "FAILED", val_id: "x" }],
      });
      const stockBefore =
        (await db.variant.findUnique({ where: { id: variantId } }))?.stock ?? 0;
      const placed = await post("/orders").send(
        orderBody({ payment: { method: "SSLCOMMERZ" } }),
      );
      const payment = await db.payment.findFirstOrThrow({
        where: { order: { orderNumber: placed.body.orderNumber } },
      });
      const failed = await post("/payments/sslcommerz/fail")
        .type("form")
        .send({ tran_id: payment.id, status: "FAILED" });
      expect(failed.status).toBe(303);
      expect(failed.headers.location).toBe(`${ORIGIN}/checkout?payment=failed`);
      const order = await db.order.findUniqueOrThrow({
        where: { orderNumber: placed.body.orderNumber },
        include: { payments: true },
      });
      expect(order.status).toBe("CANCELLED");
      expect(order.payments[0]?.status).toBe("REJECTED");
      expect(
        (await db.variant.findUnique({ where: { id: variantId } }))?.stock,
      ).toBe(stockBefore);
    });

    it("expires unpaid orders after the payment window", async () => {
      client.findByTranId = async () => ({ element: [] });
      const placed = await post("/orders").send(
        orderBody({ payment: { method: "SSLCOMMERZ" } }),
      );
      await db.payment.updateMany({
        where: { order: { orderNumber: placed.body.orderNumber } },
        data: { createdAt: new Date(Date.now() - 3 * 3_600_000) },
      });
      const { SslcommerzService } = await import(
        "../src/modules/sslcommerz/sslcommerz.service.js"
      );
      await app.get(SslcommerzService).expireStale();
      const order = await db.order.findUniqueOrThrow({
        where: { orderNumber: placed.body.orderNumber },
      });
      expect(order.status).toBe("CANCELLED");
    });
  });
});
