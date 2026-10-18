import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import { createApp, createUser, ORIGIN, TEST_DB } from "./auth-helpers.js";

// Public catalog (PRD §5.3–5.6). The golden rule: no stock number in any
// public response, whatever the endpoint.

const STOCK = 4231; // distinctive, so it can be searched for in the bodies

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

/** Every number anywhere in a JSON value. */
function numbers(value: unknown, out = new Set<number>()): Set<number> {
  if (typeof value === "number") out.add(value);
  else if (Array.isArray(value)) for (const v of value) numbers(v, out);
  else if (value && typeof value === "object") {
    for (const v of Object.values(value)) numbers(v, out);
  }
  return out;
}

describe.skipIf(!TEST_DB)("public catalog (e2e, real database)", () => {
  let app: INestApplication<App>;
  let owner: Awaited<ReturnType<typeof createUser>>;
  const run = randomUUID().slice(0, 8);
  const slug = `e2e-${run}-store-hoodie`;
  const categorySlug = `e2e-${run}-store`;

  const get = (path: string) =>
    request(app.getHttpServer()).get(`/api/v1${path}`).set("Origin", ORIGIN);

  beforeAll(async () => {
    app = await createApp();
    owner = await createUser(
      app,
      "OWNER",
      "marigold kantha 1971",
      "store.aaarchive.test",
    );
    const db = owner.prisma;
    const category = await db.category.create({
      data: { name: `E2E ${run} Store`, slug: categorySlug },
    });
    const [m, xl] = await Promise.all([
      db.size.create({ data: { name: `M${run.slice(0, 4)}` } }),
      db.size.create({ data: { name: `X${run.slice(0, 4)}` } }),
    ]);
    const color = await db.color.create({
      data: { name: `E2E ${run} Black`, hex: "#000000" },
    });
    await db.product.create({
      data: {
        name: `E2E ${run} Store Hoodie`,
        slug,
        categoryId: category.id,
        basePrice: 2490,
        status: "PUBLISHED",
        tags: ["fleece"],
        variants: {
          create: [
            {
              sizeId: m.id,
              colorId: color.id,
              sku: `E2E-${run}-M`,
              stock: STOCK,
            },
            {
              sizeId: xl.id,
              colorId: color.id,
              sku: `E2E-${run}-XL`,
              stock: 0,
              priceOverride: 2690,
            },
          ],
        },
      },
    });
    await db.product.create({
      data: {
        name: `E2E ${run} Draft`,
        slug: `e2e-${run}-draft`,
        categoryId: category.id,
        basePrice: 990,
      },
    });
  });

  afterAll(async () => {
    const db = owner.prisma;
    await db.product.deleteMany({
      where: { slug: { startsWith: `e2e-${run}` } },
    });
    await db.size.deleteMany({
      where: { name: { endsWith: run.slice(0, 4) } },
    });
    await db.color.deleteMany({ where: { name: `E2E ${run} Black` } });
    await db.category.deleteMany({ where: { slug: categorySlug } });
    await db.user.deleteMany({ where: { id: owner.id } });
    await app.close();
  });

  it("never returns a stock number from any public endpoint", async () => {
    const responses = await Promise.all([
      get(`/products?category=${categorySlug}`),
      get(`/products/${slug}`),
      get(`/products/${slug}/stock`),
      get(`/search?q=${encodeURIComponent(`${run} store hoodie`)}`),
      get(`/products/filters?category=${categorySlug}`),
      get("/categories"),
      get("/collections"),
    ]);
    for (const res of responses) {
      expect(res.status).toBe(200);
      expect(numbers(res.body).has(STOCK)).toBe(false);
      const all = keys(res.body);
      expect(all.has("stock")).toBe(false);
      expect(all.has("lowStockThreshold")).toBe(false);
    }
    const [list, page, stock] = responses;
    expect(list?.body.data).toHaveLength(1); // the draft stays hidden
    expect(list?.body.data[0]).toMatchObject({ slug, stockStatus: "in_stock" });
    expect(page?.body.variants).toHaveLength(2);
    expect(stock?.headers["cache-control"]).toBe("no-store");
    expect(
      stock?.body.variants
        .map((v: { stockStatus: string }) => v.stockStatus)
        .sort(),
    ).toEqual(["in_stock", "out_of_stock"]);
  });

  it("hides drafts and filters by size, stock and price", async () => {
    expect((await get(`/products/e2e-${run}-draft`)).status).toBe(404);
    const xlOnly = await get(
      `/products?category=${categorySlug}&size=X${run.slice(0, 4)}&inStock=1`,
    );
    expect(xlOnly.body.data).toHaveLength(0); // XL exists but is sold out
    const cheap = await get(`/products?category=${categorySlug}&maxPrice=1000`);
    expect(cheap.body.data).toHaveLength(0);
    const typo = await get(`/search?q=${encodeURIComponent(`${run} hodie`)}`);
    expect(typo.status).toBe(200);
  });
});
