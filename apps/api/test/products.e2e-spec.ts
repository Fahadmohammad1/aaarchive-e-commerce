import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import { createApp, createUser, ORIGIN, TEST_DB } from "./auth-helpers.js";

const PASSWORD = "marigold kantha 1971";
const DOMAIN = "products.aaarchive.test";

describe.skipIf(!TEST_DB)("products admin (e2e, real database)", () => {
  let app: INestApplication<App>;
  let owner: Awaited<ReturnType<typeof createUser>>;
  let staffId: string;
  let ownerToken: string;
  let staffToken: string;
  const run = randomUUID().slice(0, 8);
  const ids = {
    category: "",
    media: "",
    sizes: [] as string[],
    colors: [] as string[],
  };

  const call = (
    method: "get" | "post" | "patch" | "delete",
    path: string,
    token = ownerToken,
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

  const newProduct = (extra: Record<string, unknown> = {}) =>
    call("post", "/admin/products").send({
      name: `E2E ${run} Hoodie`,
      categoryId: ids.category,
      basePrice: 2490,
      ...extra,
    });

  beforeAll(async () => {
    app = await createApp();
    owner = await createUser(app, "OWNER", PASSWORD, DOMAIN);
    const staff = await createUser(app, "STAFF", PASSWORD, DOMAIN);
    staffId = staff.id;
    ownerToken = await signIn(owner.email);
    staffToken = await signIn(staff.email);
    const db = owner.prisma;
    ids.category = (
      await db.category.create({
        data: { name: `E2E ${run} Hoodies`, slug: `e2e-${run}-hoodies` },
      })
    ).id;
    ids.media = (
      await db.mediaAsset.create({
        data: {
          storageKey: `products/e2e-${run}`,
          width: 1600,
          height: 2000,
          widths: [400, 800],
          blurDataUrl: "data:image/webp;base64,AA==",
          byteSize: 1000,
          purpose: "product",
        },
      })
    ).id;
    for (const name of ["S", "M", "L", "XL"]) {
      ids.sizes.push(
        (await db.size.create({ data: { name: `${name}${run.slice(0, 4)}` } }))
          .id,
      );
    }
    for (const name of ["Black", "Ivory"]) {
      ids.colors.push(
        (
          await db.color.create({
            data: { name: `E2E ${run} ${name}`, hex: "#000000" },
          })
        ).id,
      );
    }
  });

  afterAll(async () => {
    const db = owner.prisma;
    await db.product.deleteMany({
      where: { slug: { startsWith: `e2e-${run}` } },
    });
    await db.sizeChart.deleteMany({
      where: { name: { startsWith: `E2E ${run}` } },
    });
    await db.size.deleteMany({ where: { id: { in: ids.sizes } } });
    await db.color.deleteMany({ where: { id: { in: ids.colors } } });
    await db.mediaAsset.deleteMany({ where: { id: ids.media } });
    await db.category.deleteMany({ where: { id: ids.category } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, staffId] } } });
    await app.close();
  });

  it("creates 2 colours × 4 sizes, sets stock, adds images and publishes", async () => {
    const created = await newProduct({ salePrice: 1990 });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      slug: `e2e-${run}-hoodie`,
      status: "DRAFT",
      saleActive: true,
      variants: [],
      sizeChart: { kind: "none" },
    });
    const id = created.body.id as string;

    const early = await call("patch", `/admin/products/${id}`).send({
      status: "PUBLISHED",
    });
    expect(early.status).toBe(400);
    expect(early.body.code).toBe("PUBLISH_NEEDS_IMAGE");

    const generated = await call("post", `/admin/products/${id}/variants`).send(
      { sizeIds: ids.sizes, colorIds: ids.colors, stock: 5 },
    );
    expect(generated.status).toBe(201);
    expect(generated.body.variants).toHaveLength(8);
    expect(generated.body.variants[0].sku).toMatch(/^E2E-.*-HOODIE-/);
    // Generating again only adds what is missing.
    const again = await call("post", `/admin/products/${id}/variants`).send({
      sizeIds: ids.sizes,
      colorIds: ids.colors,
    });
    expect(again.body.variants).toHaveLength(8);

    const [first, second] = generated.body.variants;
    const stock = await call("patch", `/admin/products/${id}/variants`).send({
      variants: [
        { id: first.id, stock: 2, expectedStock: 5 },
        { id: second.id, stock: 0, expectedStock: 5 },
      ],
    });
    expect(stock.status).toBe(200);
    const v1 = stock.body.variants.find(
      (v: { id: string }) => v.id === first.id,
    );
    expect(v1).toMatchObject({ stock: 2, stockStatus: "low_stock" });

    // The editor saw 5, but the stock is now 2: refuse, change nothing.
    const stale = await call("patch", `/admin/products/${id}/variants`).send({
      variants: [
        { id: second.id, stock: 9 },
        { id: first.id, stock: 7, expectedStock: 5 },
      ],
    });
    expect(stale.status).toBe(409);
    expect(stale.body.code).toBe("STOCK_CHANGED");
    const after = await call("get", `/admin/products/${id}`);
    expect(
      after.body.variants.find((v: { id: string }) => v.id === second.id).stock,
    ).toBe(0);

    const published = await call("patch", `/admin/products/${id}`).send({
      status: "PUBLISHED",
      images: [{ mediaId: ids.media, alt: "Front", colorId: ids.colors[0] }],
    });
    expect(published.status).toBe(200);
    expect(published.body).toMatchObject({
      status: "PUBLISHED",
      images: [{ mediaId: ids.media, alt: "Front", colorId: ids.colors[0] }],
    });

    const noImages = await call("patch", `/admin/products/${id}`).send({
      images: [],
    });
    expect(noImages.body.code).toBe("PUBLISH_NEEDS_IMAGE");

    const low = await call(
      "get",
      `/admin/products?q=${encodeURIComponent(`E2E ${run}`)}&stock=out&sort=stock_asc`,
    );
    expect(low.body.data).toHaveLength(1);
    expect(low.body.data[0]).toMatchObject({
      id,
      variantCount: 8,
      totalStock: 32,
      lowStockCount: 1,
      outOfStockCount: 1,
    });
  });

  it("rejects a sale price that is not below the base price, also on PATCH", async () => {
    const bad = await newProduct({ name: `E2E ${run} Sale`, salePrice: 2490 });
    expect(bad.status).toBe(400);
    const ok = await newProduct({ name: `E2E ${run} Sale` });
    const patch = await call("patch", `/admin/products/${ok.body.id}`).send({
      salePrice: 3000,
    });
    expect(patch.status).toBe(400);
    expect(patch.body.code).toBe("SALE_NOT_BELOW_BASE");
  });

  it("keeps custom size tables out of the templates list", async () => {
    const res = await newProduct({
      name: `E2E ${run} Panjabi`,
      sizeChart: {
        kind: "custom",
        table: { columns: ["Size", "Chest"], rows: [["40", "42"]] },
      },
    });
    expect(res.body.sizeChart).toEqual({
      kind: "custom",
      table: { columns: ["Size", "Chest"], rows: [["40", "42"]] },
    });
    const templates = await call(
      "get",
      `/admin/size-charts?q=${encodeURIComponent(`E2E ${run}`)}`,
    );
    expect(templates.body.data).toHaveLength(0);

    const cleared = await call("patch", `/admin/products/${res.body.id}`).send({
      sizeChart: { kind: "none" },
    });
    expect(cleared.body.sizeChart).toEqual({ kind: "none" });
    expect(
      await owner.prisma.sizeChart.count({
        where: { name: `E2E ${run} Panjabi` },
      }),
    ).toBe(0);
  });

  it("duplicates as a draft with stock 0 and new SKUs", async () => {
    const source = await newProduct({ name: `E2E ${run} Tee` });
    await call("post", `/admin/products/${source.body.id}/variants`).send({
      sizeIds: ids.sizes.slice(0, 2),
      colorIds: ids.colors.slice(0, 1),
      stock: 4,
    });
    const copy = await call(
      "post",
      `/admin/products/${source.body.id}/duplicate`,
    );
    expect(copy.status).toBe(201);
    expect(copy.body).toMatchObject({
      name: `E2E ${run} Tee (copy)`,
      slug: `e2e-${run}-tee-copy`,
      status: "DRAFT",
    });
    expect(copy.body.variants.map((v: { stock: number }) => v.stock)).toEqual([
      0, 0,
    ]);
    expect(
      (await call("delete", `/admin/products/${copy.body.id}`)).status,
    ).toBe(204);
  });

  it("exports the filtered products as CSV, one row per variant (Owner only)", async () => {
    const q = encodeURIComponent(`E2E ${run} Hoodie`);
    const csv = await call(
      "get",
      `/admin/products/export?format=csv&q=${q}`,
    ).buffer(true);
    expect(csv.status).toBe(200);
    expect(csv.headers["content-type"]).toContain("text/csv");
    expect(csv.headers["content-disposition"]).toMatch(
      /aaarchive-products-\d{4}-\d{2}-\d{2}\.csv/,
    );
    const lines = csv.text
      .replace(/^\uFEFF/, "")
      .trim()
      .split("\r\n");
    expect(lines[0]).toBe(
      "Product,Category,SKU,Size,Colour,Stock,Price,Sale price,Status,Variant on sale",
    );
    // The hoodie from the first test: 2 colours × 4 sizes.
    expect(lines).toHaveLength(1 + 8);
    expect(lines[1]).toContain(`E2E ${run} Hoodie`);

    const xlsx = await call("get", `/admin/products/export?format=xlsx&q=${q}`);
    expect(xlsx.status).toBe(200);
    expect(xlsx.headers["content-type"]).toContain("spreadsheetml");

    expect(
      (await call("get", "/admin/products/export?format=csv", staffToken))
        .status,
    ).toBe(403);
    expect(
      (await call("get", "/admin/products/export?format=pdf")).status,
    ).toBe(400);
  });

  it("lets Staff read products but not change them", async () => {
    expect((await call("get", "/admin/products", staffToken)).status).toBe(200);
    const res = await call("post", "/admin/products", staffToken).send({
      name: `E2E ${run} Nope`,
      categoryId: ids.category,
      basePrice: 100,
    });
    expect(res.status).toBe(403);
  });
});
