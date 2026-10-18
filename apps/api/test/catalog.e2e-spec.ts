import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import { createApp, createUser, ORIGIN, TEST_DB } from "./auth-helpers.js";

const PASSWORD = "marigold kantha 1971";
const DOMAIN = "catalog.aaarchive.test";

describe.skipIf(!TEST_DB)("catalog admin (e2e, real database)", () => {
  let app: INestApplication<App>;
  let owner: Awaited<ReturnType<typeof createUser>>;
  let staffId: string;
  let ownerToken: string;
  let staffToken: string;
  // Unique per run so the suite can run against a reused database.
  const run = randomUUID().slice(0, 8);

  const call = (
    method: "get" | "post" | "patch" | "delete",
    path: string,
    token: string,
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

  beforeAll(async () => {
    app = await createApp();
    owner = await createUser(app, "OWNER", PASSWORD, DOMAIN);
    const staff = await createUser(app, "STAFF", PASSWORD, DOMAIN);
    staffId = staff.id;
    ownerToken = await signIn(owner.email);
    staffToken = await signIn(staff.email);
  });

  afterAll(async () => {
    await owner.prisma.product.deleteMany({
      where: { slug: { startsWith: `e2e-${run}` } },
    });
    await owner.prisma.category.deleteMany({
      where: { name: { startsWith: `E2E ${run}` } },
    });
    await owner.prisma.collection.deleteMany({
      where: { name: { startsWith: `E2E ${run}` } },
    });
    await owner.prisma.size.deleteMany({
      where: { name: `Z${run.slice(0, 5)}` },
    });
    await owner.prisma.color.deleteMany({ where: { name: `E2E ${run}` } });
    // Only this suite's users: other e2e files run in parallel.
    await owner.prisma.user.deleteMany({
      where: { id: { in: [owner.id, staffId] } },
    });
    await app.close();
  });

  it("generates unique slugs and refuses a taken one", async () => {
    const first = await call("post", "/admin/categories", ownerToken).send({
      name: `E2E ${run} Hoodies`,
    });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({
      slug: `e2e-${run}-hoodies`,
      description: null,
      image: null,
      showOnHome: false,
      productCount: 0,
    });

    const second = await call("post", "/admin/categories", ownerToken).send({
      name: `E2E ${run} Hoodies`,
    });
    expect(second.body.slug).toBe(`e2e-${run}-hoodies-2`);

    const clash = await call(
      "patch",
      `/admin/categories/${second.body.id}`,
      ownerToken,
    ).send({
      slug: first.body.slug,
    });
    expect(clash.status).toBe(409);
    expect(clash.body.code).toBe("SLUG_TAKEN");
  });

  it("keeps the slug when renaming and only changes fields that were sent", async () => {
    const created = await call("post", "/admin/categories", ownerToken).send({
      name: `E2E ${run} Panjabi`,
      showOnHome: true,
      sortOrder: 4,
    });
    const renamed = await call(
      "patch",
      `/admin/categories/${created.body.id}`,
      ownerToken,
    ).send({ name: `E2E ${run} Panjabi Eid` });
    expect(renamed.status).toBe(200);
    expect(renamed.body).toMatchObject({
      name: `E2E ${run} Panjabi Eid`,
      slug: created.body.slug,
      showOnHome: true,
      sortOrder: 4,
    });
  });

  it("rejects unknown fields and images that do not exist", async () => {
    const extra = await call("post", "/admin/categories", ownerToken).send({
      name: `E2E ${run} X`,
      stock: 5,
    });
    expect(extra.status).toBe(400);
    expect(extra.body.code).toBe("VALIDATION_ERROR");

    const image = await call("post", "/admin/collections", ownerToken).send({
      name: `E2E ${run} Winter`,
      image: { mediaId: "missing", alt: "Winter drop" },
    });
    expect(image.status).toBe(400);
    expect(image.body.code).toBe("MEDIA_NOT_FOUND");
  });

  it("refuses to delete a category that still has products", async () => {
    const category = await call("post", "/admin/categories", ownerToken).send({
      name: `E2E ${run} Tees`,
    });
    await owner.prisma.product.create({
      data: {
        name: "E2E tee",
        slug: `e2e-${run}-tee`,
        basePrice: 990,
        categoryId: category.body.id,
      },
    });
    const res = await call(
      "delete",
      `/admin/categories/${category.body.id}`,
      ownerToken,
    );
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("CATEGORY_IN_USE");
  });

  it("lets Staff read the catalog but not change it", async () => {
    expect((await call("get", "/admin/categories", staffToken)).status).toBe(
      200,
    );
    expect((await call("get", "/admin/sizes", staffToken)).status).toBe(200);
    for (const path of [
      "/admin/categories",
      "/admin/collections",
      "/admin/sizes",
      "/admin/colors",
    ]) {
      const res = await call("post", path, staffToken).send({
        name: `E2E ${run} S`,
        hex: "#000000",
      });
      expect(res.status).toBe(403);
    }
  });

  it("creates collections, sizes and colours with their own rules", async () => {
    const collection = await call(
      "post",
      "/admin/collections",
      ownerToken,
    ).send({
      name: `E2E ${run} Eid`,
    });
    expect(collection.body).toMatchObject({
      isActive: true,
      showOnHome: false,
    });
    const hidden = await call(
      "patch",
      `/admin/collections/${collection.body.id}`,
      ownerToken,
    ).send({ isActive: false });
    expect(hidden.body.isActive).toBe(false);
    expect(
      (
        await call(
          "delete",
          `/admin/collections/${collection.body.id}`,
          ownerToken,
        )
      ).status,
    ).toBe(204);

    const size = await call("post", "/admin/sizes", ownerToken).send({
      name: `Z${run.slice(0, 5)}`,
    });
    expect(size.status).toBe(201);
    const dupe = await call("post", "/admin/sizes", ownerToken).send({
      name: `Z${run.slice(0, 5)}`,
    });
    expect(dupe.status).toBe(409);
    expect(dupe.body.code).toBe("NAME_TAKEN");

    const color = await call("post", "/admin/colors", ownerToken).send({
      name: `E2E ${run}`,
      hex: "#e4ddc0",
    });
    expect(color.body).toMatchObject({ hex: "#E4DDC0", variantCount: 0 });
  });

  it("returns 404 for a missing record", async () => {
    const res = await call("patch", "/admin/sizes/missing", ownerToken).send({
      sortOrder: 1,
    });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });
});
