import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import { createApp, createUser, ORIGIN, TEST_DB } from "./auth-helpers.js";

// Phase 6: editable content, pages, FAQ, settings that take effect, staff
// management (PRD §5.2, §5.11, §6.7, §6.8).

const PASSWORD = "marigold kantha 1971";
const DOMAIN = "content.aaarchive.test";

describe.skipIf(!TEST_DB)(
  "content, settings and staff (e2e, real database)",
  () => {
    let app: INestApplication<App>;
    let owner: Awaited<ReturnType<typeof createUser>>;
    let ownerToken: string;
    let staffToken: string;
    const userIds: string[] = [];
    const run = randomUUID().slice(0, 8);
    let mediaId: string;
    let publishedId: string;
    let draftId: string;
    let variantId: string;
    const restore: Array<() => Promise<unknown>> = [];

    const db = () => owner.prisma;
    const call = (
      method: "get" | "post" | "patch" | "put" | "delete",
      path: string,
      token?: string,
    ) => {
      const r = request(app.getHttpServer())
        [method](`/api/v1${path}`)
        .set("Origin", ORIGIN);
      return token ? r.set("Authorization", `Bearer ${token}`) : r;
    };
    const signIn = async (email: string, password = PASSWORD) => {
      const res = await call("post", "/auth/login").send({ email, password });
      return res.body.accessToken as string;
    };

    /** Puts a ContentBlock / Setting row back the way it was after the suite. */
    const keepContent = async (key: string) => {
      const before = await db().contentBlock.findUnique({ where: { key } });
      restore.push(() =>
        before
          ? db().contentBlock.update({
              where: { key },
              data: { data: before.data ?? {} },
            })
          : db().contentBlock.deleteMany({ where: { key } }),
      );
    };
    const keepSetting = async (key: string) => {
      const before = await db().setting.findUnique({ where: { key } });
      restore.push(() =>
        before
          ? db().setting.update({
              where: { key },
              data: { value: before.value ?? {} },
            })
          : db().setting.deleteMany({ where: { key } }),
      );
    };

    beforeAll(async () => {
      app = await createApp();
      owner = await createUser(app, "OWNER", PASSWORD, DOMAIN);
      const staff = await createUser(app, "STAFF", PASSWORD, DOMAIN);
      userIds.push(owner.id, staff.id);
      ownerToken = await signIn(owner.email);
      staffToken = await signIn(staff.email);

      const media = await db().mediaAsset.create({
        data: {
          storageKey: `content/e2e-${run}`,
          width: 1600,
          height: 2000,
          widths: [400, 800],
          blurDataUrl: "data:image/webp;base64,AAAA",
          byteSize: 1000,
          purpose: "content",
        },
      });
      mediaId = media.id;
      const category = await db().category.create({
        data: {
          name: `E2E ${run} Content`,
          slug: `e2e-${run}-content`,
          showOnHome: true,
        },
      });
      const [size, color] = await Promise.all([
        db().size.create({ data: { name: `C${run.slice(0, 5)}` } }),
        db().color.create({
          data: { name: `E2E ${run} Teal`, hex: "#008080" },
        }),
      ]);
      const published = await db().product.create({
        data: {
          name: `E2E ${run} Look Hoodie`,
          slug: `e2e-${run}-look-hoodie`,
          categoryId: category.id,
          basePrice: 1990,
          status: "PUBLISHED",
          variants: {
            create: [
              {
                sizeId: size.id,
                colorId: color.id,
                sku: `E2E-${run}-C`,
                stock: 50,
              },
            ],
          },
        },
        include: { variants: true },
      });
      publishedId = published.id;
      variantId = published.variants[0].id;
      const draft = await db().product.create({
        data: {
          name: `E2E ${run} Draft`,
          slug: `e2e-${run}-draft`,
          categoryId: category.id,
          basePrice: 1,
        },
      });
      draftId = draft.id;
      for (const key of ["home.hero", "home.lookFile", "home.social"])
        await keepContent(key);
      for (const key of ["stock", "store"]) await keepSetting(key);
      restore.push(async () => {
        await db().socialPost.deleteMany({ where: { mediaId } });
        await db().page.deleteMany({
          where: { slug: { startsWith: `e2e-${run}` } },
        });
        await db().faqItem.deleteMany({
          where: { question: { startsWith: `E2E ${run}` } },
        });
        await db().product.deleteMany({
          where: { id: { in: [publishedId, draftId] } },
        });
        await db().size.deleteMany({ where: { id: size.id } });
        await db().color.deleteMany({ where: { id: color.id } });
        await db().category.deleteMany({ where: { id: category.id } });
        await db().mediaAsset.deleteMany({ where: { id: mediaId } });
      });
    });

    afterAll(async () => {
      for (const undo of restore.reverse()) await undo();
      await db().user.deleteMany({ where: { id: { in: userIds } } });
      await db().user.deleteMany({
        where: { email: { endsWith: `@${run}.${DOMAIN}` } },
      });
      await app.close();
    });

    const image = () => ({ mediaId, alt: "Model in a red-lit room" });

    it("only the owner edits content, and only valid content is saved", async () => {
      const hero = {
        headline: ["Made for every season"],
        audiences: [{ label: "Men", href: "/shop?audience=men" }],
        mainImage: image(),
        sideImages: [],
      };
      expect(
        (
          await call("put", "/admin/content/home.hero", staffToken).send({
            data: hero,
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await call("put", "/admin/content/home.nope", ownerToken).send({
            data: hero,
          })
        ).status,
      ).toBe(404);
      const invalid = await call(
        "put",
        "/admin/content/home.hero",
        ownerToken,
      ).send({
        data: { ...hero, mainImage: { mediaId, alt: "" } },
      });
      expect(invalid.body.code).toBe("VALIDATION_ERROR");
      const missingMedia = await call(
        "put",
        "/admin/content/home.hero",
        ownerToken,
      ).send({
        data: { ...hero, mainImage: { mediaId: "nope", alt: "x" } },
      });
      expect(missingMedia.body.code).toBe("MEDIA_NOT_FOUND");
      const saved = await call(
        "put",
        "/admin/content/home.hero",
        ownerToken,
      ).send({ data: hero });
      expect(saved.status).toBe(200);
      expect(saved.body.updatedBy).toBe("Test OWNER");

      const list = await call("get", "/admin/content", staffToken);
      expect(list.status).toBe(200);
      expect(list.body.media[mediaId]).toBeDefined();
    });

    it("resolves the home page and leaves out what is not published", async () => {
      await call("put", "/admin/content/home.lookFile", ownerToken).send({
        data: {
          heading: ["Look file"],
          label: "Filed under: Winter",
          intro: "",
          image: image(),
          href: "/shop",
          items: [
            { productId: publishedId, hotspot: { x: 30, y: 40 } },
            { productId: draftId, hotspot: { x: 60, y: 70 } },
          ],
        },
      });
      await call("put", "/admin/content/home.social", ownerToken).send({
        data: {
          heading: ["Follow"],
          intro: "",
          followHref: "https://instagram.com/aaarchive",
        },
      });
      const post = await call("post", "/admin/social-posts", ownerToken).send({
        image: image(),
        label: "12K+ likes",
        platform: "INSTAGRAM",
        link: "https://instagram.com/p/e2e",
      });
      expect(post.status).toBe(201);

      const home = await call("get", "/content/home");
      expect(home.status).toBe(200);
      expect(home.body.hero.mainImage).toMatchObject({
        alt: "Model in a red-lit room",
      });
      expect(home.body.hero.mainImage.media.renditions).toHaveLength(2);
      expect(home.body.lookFile.items).toHaveLength(1);
      expect(home.body.lookFile.items[0].product.slug).toBe(
        `e2e-${run}-look-hoodie`,
      );
      expect(JSON.stringify(home.body)).not.toContain('"stock"');
      expect(
        home.body.social.posts.some(
          (p: { label: string }) => p.label === "12K+ likes",
        ),
      ).toBe(true);
      expect(
        home.body.categories.items.some(
          (c: { slug: string }) => c.slug === `e2e-${run}-content`,
        ),
      ).toBe(true);
    });

    it("serves pages by slug and only active FAQ items", async () => {
      const page = {
        slug: `e2e-${run}-returns`,
        title: "Return policy",
        content: "## Window\nThree days.",
        seoTitle: null,
        seoDesc: null,
      };
      expect(
        (await call("post", "/admin/pages", ownerToken).send(page)).status,
      ).toBe(201);
      expect(
        (await call("post", "/admin/pages", ownerToken).send(page)).body.code,
      ).toBe("SLUG_TAKEN");
      const pub = await call("get", `/pages/${page.slug}`);
      expect(pub.body).toMatchObject({
        title: "Return policy",
        content: "## Window\nThree days.",
      });
      expect(pub.body.id).toBeUndefined();
      expect((await call("get", `/pages/e2e-${run}-missing`)).status).toBe(404);

      await call("post", "/admin/faq", ownerToken).send({
        question: `E2E ${run} shown?`,
        answer: "Yes.",
      });
      await call("post", "/admin/faq", ownerToken).send({
        question: `E2E ${run} hidden?`,
        answer: "No.",
        isActive: false,
      });
      const faq = await call("get", "/faq");
      const mine = faq.body.filter((f: { question: string }) =>
        f.question.startsWith(`E2E ${run}`),
      );
      expect(mine.map((f: { question: string }) => f.question)).toEqual([
        `E2E ${run} shown?`,
      ]);
    });

    it("settings are owner-only and take effect in the store", async () => {
      expect((await call("get", "/admin/settings", staffToken)).status).toBe(
        403,
      );
      expect(
        (
          await call("put", "/admin/settings/stock", ownerToken).send({
            value: { maxQtyPerVariant: 0 },
          })
        ).body.code,
      ).toBe("VALIDATION_ERROR");
      const saved = await call("put", "/admin/settings/stock", ownerToken).send(
        {
          value: { lowStockThreshold: 60, maxQtyPerVariant: 3 },
        },
      );
      expect(saved.status).toBe(200);

      const pdp = await call("get", `/products/e2e-${run}-look-hoodie`);
      expect(pdp.body.maxQtyPerVariant).toBe(3);
      // 50 left is now under the store threshold of 60.
      const stock = await call("get", `/products/e2e-${run}-look-hoodie/stock`);
      expect(stock.body.variants[0].stockStatus).toBe("low_stock");
      const cart = await call("post", "/cart/validate").send({
        items: [{ variantId, quantity: 5 }],
      });
      expect(cart.body.items[0].quantity).toBe(3);

      await call("put", "/admin/settings/store", ownerToken).send({
        value: { name: "Aaarchive", whatsapp: "+8801712345689", logo: image() },
      });
      const pub = await call("get", "/settings/public");
      expect(pub.body.store).toMatchObject({ whatsapp: "01712345689" });
      expect(pub.body.store.logo.alt).toBe("Model in a red-lit room");
      expect(pub.body.tracking).toBeDefined();
    });

    it("the contact form says so when no store inbox is set", async () => {
      const res = await call("post", "/contact").send({
        name: "Rahim",
        contact: "01712345689",
        message: "Do you have the hoodie in XL?",
      });
      expect(res.status).toBe(503);
      expect(res.body.code).toBe("CONTACT_UNAVAILABLE");
    });

    it("manages staff with guards against locking the store out", async () => {
      expect((await call("get", "/admin/staff", staffToken)).status).toBe(403);
      const email = `new@${run}.${DOMAIN}`;
      const weak = await call("post", "/admin/staff", ownerToken).send({
        name: "New Staff",
        email,
        role: "STAFF",
        password: "password123",
      });
      expect(weak.status).toBe(400);
      const created = await call("post", "/admin/staff", ownerToken).send({
        name: "New Staff",
        email,
        role: "STAFF",
        password: "kantha marigold 2026",
      });
      expect(created.status).toBe(201);
      expect(created.body.passwordHash).toBeUndefined();
      expect(
        (
          await call("post", "/admin/staff", ownerToken).send({
            name: "Again",
            email,
            role: "STAFF",
            password: "kantha marigold 2026",
          })
        ).body.code,
      ).toBe("EMAIL_TAKEN");

      const self = await call(
        "patch",
        `/admin/staff/${owner.id}`,
        ownerToken,
      ).send({ isActive: false });
      expect(self.body.code).toBe("CANNOT_CHANGE_SELF");

      const token = await signIn(email, "kantha marigold 2026");
      expect((await call("get", "/admin/orders", token)).status).toBe(200);
      await call("patch", `/admin/staff/${created.body.id}`, ownerToken).send({
        isActive: false,
      });
      expect((await call("get", "/admin/orders", token)).status).toBe(401);
    });
  },
);
