import { cacheTags } from "@aaarchive/shared/cache-tags";
import {
  type adminProductListQuerySchema,
  type ProductValues,
  pricingIssues,
  type productSizeChartInputSchema,
  type productUpdateSchema,
  skuFor,
} from "@aaarchive/shared/product";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@aaarchive/shared/stock";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { z } from "zod";
import { isUniqueViolation } from "../../common/prisma/prisma-errors.js";
import { uniqueSlug } from "../../common/slug/unique-slug.js";
import { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { MediaService } from "../media/media.service.js";
import { RevalidationService } from "../revalidation/revalidation.service.js";
import {
  type AdminProduct,
  productDetailInclude,
  productListInclude,
  toAdminProduct,
  toAdminProductListItem,
} from "./products.mapper.js";
import { uniqueSkus } from "./sku.js";

type ListQuery = z.output<typeof adminProductListQuerySchema>;
type UpdateInput = z.output<typeof productUpdateSchema>;
type SizeChartInput = z.output<typeof productSizeChartInputSchema>;
type Tx = Prisma.TransactionClient;

/** Products (PRD §6.2). Every response here is admin-only (stock numbers). */
@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly revalidation: RevalidationService,
  ) {}

  // ── Reads ────────────────────────────────────────────────────────────────

  async list(query: ListQuery) {
    const { page, limit } = query;
    const where = whereSql(query);
    // Sorting by stock needs the sum over variants, which Prisma cannot order
    // by; one SQL query picks the page's ids, Prisma loads the rows.
    const [ids, [{ total }]] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT p.id
        FROM "Product" p
        LEFT JOIN "Variant" v ON v."productId" = p.id AND v."isActive"
        WHERE ${where}
        GROUP BY p.id
        ORDER BY ${orderSql(query.sort)}, p.id
        LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      this.prisma.$queryRaw<{ total: number }[]>`
        SELECT count(*)::int AS total FROM "Product" p WHERE ${where}`,
    ]);
    const rows = await this.prisma.product.findMany({
      where: { id: { in: ids.map((r) => r.id) } },
      include: productListInclude,
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return {
      data: ids
        .map((r) => byId.get(r.id))
        .filter((r) => r !== undefined)
        .map((r) => toAdminProductListItem(r, this.media)),
      meta: { page, limit, total },
    };
  }

  async get(id: string): Promise<AdminProduct> {
    const row = await this.prisma.product.findUnique({
      where: { id },
      include: productDetailInclude,
    });
    if (!row) throw notFound();
    return toAdminProduct(row, this.media);
  }

  // ── Writes ───────────────────────────────────────────────────────────────

  async create(input: ProductValues): Promise<AdminProduct> {
    await this.assertReferences(input);
    if (input.status === "PUBLISHED") {
      // A new product has no variants yet: create, add variants, then publish.
      throw badRequest("PUBLISH_NEEDS_VARIANT", "status");
    }
    if (input.slug && (await this.slugTaken(input.slug))) throw slugTaken();
    const slug =
      input.slug ?? (await uniqueSlug(input.name, this.slugTaken, "product"));

    const id = await this.prisma
      .$transaction(async (tx) => {
        const sizeChartId = await saveSizeChart(tx, input.sizeChart, null, {
          name: input.name,
        });
        const row = await tx.product.create({
          data: {
            ...scalarData(input),
            name: input.name,
            basePrice: input.basePrice,
            slug,
            categoryId: input.categoryId,
            sizeChartId,
            images: { create: imageData(input.images) },
            collections: {
              create: input.collectionIds.map((collectionId) => ({
                collectionId,
              })),
            },
          },
          select: { id: true },
        });
        return row.id;
      })
      .catch(rethrowSlugTaken);
    void this.revalidation.revalidate(tagsFor(slug));
    return this.get(id);
  }

  async update(id: string, input: UpdateInput): Promise<AdminProduct> {
    const current = await this.prisma.product.findUnique({
      where: { id },
      include: {
        sizeChart: { select: { id: true, isTemplate: true } },
        _count: { select: { images: true } },
        variants: { where: { isActive: true }, select: { id: true } },
      },
    });
    if (!current) throw notFound();
    await this.assertReferences(input);

    const merged = {
      basePrice: input.basePrice ?? current.basePrice,
      salePrice:
        input.salePrice !== undefined ? input.salePrice : current.salePrice,
      saleStart:
        input.saleStart !== undefined ? input.saleStart : current.saleStart,
      saleEnd: input.saleEnd !== undefined ? input.saleEnd : current.saleEnd,
    };
    const [issue] = pricingIssues(merged);
    if (issue) throw badRequest(issue[1], issue[0]);

    const status = input.status ?? current.status;
    if (status === "PUBLISHED") {
      const imageCount = input.images?.length ?? current._count.images;
      if (imageCount === 0) throw badRequest("PUBLISH_NEEDS_IMAGE", "images");
      if (current.status !== "PUBLISHED" && current.variants.length === 0) {
        throw badRequest("PUBLISH_NEEDS_VARIANT", "status");
      }
    }
    if (
      input.slug &&
      input.slug !== current.slug &&
      (await this.slugTaken(input.slug))
    ) {
      throw slugTaken();
    }

    const slug = await this.prisma
      .$transaction(async (tx) => {
        const sizeChartId =
          input.sizeChart === undefined
            ? undefined
            : await saveSizeChart(tx, input.sizeChart, current.sizeChart, {
                name: input.name ?? current.name,
              });
        if (input.images) {
          await tx.productImage.deleteMany({ where: { productId: id } });
        }
        if (input.collectionIds) {
          await tx.productCollection.deleteMany({ where: { productId: id } });
        }
        const row = await tx.product.update({
          where: { id },
          data: {
            ...scalarData(input),
            // The slug only changes when sent: renaming keeps URLs stable.
            slug: input.slug,
            ...(input.categoryId && {
              category: { connect: { id: input.categoryId } },
            }),
            ...(sizeChartId !== undefined && {
              sizeChart: sizeChartId
                ? { connect: { id: sizeChartId } }
                : { disconnect: true },
            }),
            ...(input.images && {
              images: { create: imageData(input.images) },
            }),
            ...(input.collectionIds && {
              collections: {
                create: input.collectionIds.map((collectionId) => ({
                  collectionId,
                })),
              },
            }),
          },
          select: { slug: true },
        });
        // A custom table the product no longer uses goes with it.
        if (
          sizeChartId !== undefined &&
          current.sizeChart &&
          !current.sizeChart.isTemplate &&
          current.sizeChart.id !== sizeChartId
        ) {
          await tx.sizeChart.delete({ where: { id: current.sizeChart.id } });
        }
        return row.slug;
      })
      .catch(rethrowSlugTaken);
    void this.revalidation.revalidate([
      ...tagsFor(slug),
      cacheTags.product(current.slug),
    ]);
    return this.get(id);
  }

  /** A DRAFT copy: same details, images, collections and size chart; variants with stock 0. */
  async duplicate(id: string): Promise<AdminProduct> {
    const source = await this.prisma.product.findUnique({
      where: { id },
      include: {
        sizeChart: true,
        images: { orderBy: { sortOrder: "asc" } },
        collections: true,
        variants: { include: { size: true, color: true } },
      },
    });
    if (!source) throw notFound();
    const name = copyName(source.name);
    const slug = await uniqueSlug(name, this.slugTaken, "product");

    const newId = await this.prisma
      .$transaction(async (tx) => {
        let sizeChartId = source.sizeChartId;
        if (source.sizeChart && !source.sizeChart.isTemplate) {
          const copy = await tx.sizeChart.create({
            data: {
              name,
              columns: source.sizeChart.columns as Prisma.InputJsonValue,
              rows: source.sizeChart.rows as Prisma.InputJsonValue,
              isTemplate: false,
            },
            select: { id: true },
          });
          sizeChartId = copy.id;
        }
        const skus = await uniqueSkus(
          tx,
          source.variants.map((v) => skuFor(slug, v.size.name, v.color.name)),
        );
        const row = await tx.product.create({
          data: {
            name,
            slug,
            shortDesc: source.shortDesc,
            description: source.description,
            fabric: source.fabric,
            gsm: source.gsm,
            care: source.care,
            tags: source.tags,
            categoryId: source.categoryId,
            basePrice: source.basePrice,
            salePrice: source.salePrice,
            saleStart: source.saleStart,
            saleEnd: source.saleEnd,
            lowStockThreshold: source.lowStockThreshold,
            sizeChartId,
            status: "DRAFT",
            isFeatured: false,
            seoTitle: source.seoTitle,
            seoDesc: source.seoDesc,
            images: {
              create: source.images.map((image, i) => ({
                mediaId: image.mediaId,
                alt: image.alt,
                colorId: image.colorId,
                sortOrder: i,
              })),
            },
            collections: {
              create: source.collections.map((c) => ({
                collectionId: c.collectionId,
              })),
            },
            variants: {
              create: source.variants.map((v, i) => ({
                sizeId: v.sizeId,
                colorId: v.colorId,
                sku: skus[i] as string,
                stock: 0,
                priceOverride: v.priceOverride,
                isActive: v.isActive,
              })),
            },
          },
          select: { id: true },
        });
        return row.id;
      })
      .catch(rethrowSlugTaken);
    return this.get(newId);
  }

  /** Only products never ordered can be deleted; others are archived. */
  async remove(id: string): Promise<void> {
    const row = await this.prisma.product.findUnique({
      where: { id },
      select: {
        slug: true,
        sizeChart: { select: { id: true, isTemplate: true } },
      },
    });
    if (!row) throw notFound();
    const ordered = await this.prisma.orderItem.count({
      where: { variant: { productId: id } },
    });
    if (ordered > 0) {
      throw new ConflictException({
        message: "This product has orders. Archive it instead.",
        code: "PRODUCT_HAS_ORDERS",
      });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.product.delete({ where: { id } });
      if (row.sizeChart && !row.sizeChart.isTemplate) {
        await tx.sizeChart.delete({ where: { id: row.sizeChart.id } });
      }
    });
    void this.revalidation.revalidate(tagsFor(row.slug));
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private readonly slugTaken = async (slug: string): Promise<boolean> =>
    (await this.prisma.product.count({ where: { slug } })) > 0;

  /** Every id the input points at exists (400 with a code otherwise). */
  private async assertReferences(input: UpdateInput): Promise<void> {
    const checks: Promise<void>[] = [];
    if (input.categoryId) {
      checks.push(
        this.prisma.category
          .count({ where: { id: input.categoryId } })
          .then((n) => {
            if (n === 0) throw badRequest("CATEGORY_NOT_FOUND", "categoryId");
          }),
      );
    }
    const collectionIds = input.collectionIds ?? [];
    if (collectionIds.length) {
      checks.push(
        this.prisma.collection
          .count({ where: { id: { in: collectionIds } } })
          .then((n) => {
            if (n !== collectionIds.length) {
              throw badRequest("COLLECTION_NOT_FOUND", "collectionIds");
            }
          }),
      );
    }
    const images = input.images ?? [];
    if (images.length) {
      checks.push(
        this.prisma.mediaAsset
          .count({ where: { id: { in: images.map((i) => i.mediaId) } } })
          .then((n) => {
            if (n !== images.length)
              throw badRequest("MEDIA_NOT_FOUND", "images");
          }),
      );
      const colorIds = [
        ...new Set(images.flatMap((i) => (i.colorId ? [i.colorId] : []))),
      ];
      if (colorIds.length) {
        checks.push(
          this.prisma.color
            .count({ where: { id: { in: colorIds } } })
            .then((n) => {
              if (n !== colorIds.length) {
                throw badRequest("COLOR_NOT_FOUND", "images");
              }
            }),
        );
      }
    }
    if (input.sizeChart?.kind === "template") {
      const sizeChartId = input.sizeChart.sizeChartId;
      checks.push(
        this.prisma.sizeChart
          .count({ where: { id: sizeChartId, isTemplate: true } })
          .then((n) => {
            if (n === 0) throw badRequest("SIZE_CHART_NOT_FOUND", "sizeChart");
          }),
      );
    }
    await Promise.all(checks);
  }
}

// ── Pure helpers ─────────────────────────────────────────────────────────

function scalarData(input: UpdateInput) {
  return {
    name: input.name,
    shortDesc: input.shortDesc,
    description: input.description,
    fabric: input.fabric,
    gsm: input.gsm,
    care: input.care,
    tags: input.tags,
    basePrice: input.basePrice,
    salePrice: input.salePrice,
    saleStart:
      input.saleStart === undefined
        ? undefined
        : input.saleStart && new Date(input.saleStart),
    saleEnd:
      input.saleEnd === undefined
        ? undefined
        : input.saleEnd && new Date(input.saleEnd),
    lowStockThreshold: input.lowStockThreshold,
    status: input.status,
    isFeatured: input.isFeatured,
    seoTitle: input.seoTitle,
    seoDesc: input.seoDesc,
  };
}

function imageData(images: NonNullable<UpdateInput["images"]>) {
  return images.map((image, sortOrder) => ({
    mediaId: image.mediaId,
    alt: image.alt,
    colorId: image.colorId,
    sortOrder,
  }));
}

/**
 * Applies the product's size-chart choice and returns the chart id to link
 * (null for none). A custom table is updated in place when the product
 * already has one; the caller deletes a custom table that is left behind.
 */
async function saveSizeChart(
  tx: Tx,
  choice: SizeChartInput,
  current: { id: string; isTemplate: boolean } | null,
  product: { name: string },
): Promise<string | null> {
  if (choice.kind === "none") return null;
  if (choice.kind === "template") return choice.sizeChartId;
  const data = {
    name: product.name,
    columns: choice.table.columns,
    rows: choice.table.rows,
  };
  if (current && !current.isTemplate) {
    await tx.sizeChart.update({ where: { id: current.id }, data });
    return current.id;
  }
  const created = await tx.sizeChart.create({
    data: { ...data, isTemplate: false },
    select: { id: true },
  });
  return created.id;
}

function copyName(name: string): string {
  const suffix = " (copy)";
  return `${name.slice(0, 120 - suffix.length)}${suffix}`;
}

/** Escapes LIKE wildcards in a search term. */
function likeTerm(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

function whereSql(query: ListQuery): Prisma.Sql {
  const parts: Prisma.Sql[] = [Prisma.sql`TRUE`];
  if (query.q) {
    const term = likeTerm(query.q);
    parts.push(Prisma.sql`(
      p.name ILIKE ${term} OR p.slug ILIKE ${term}
      OR EXISTS (SELECT 1 FROM "Variant" s WHERE s."productId" = p.id AND s.sku ILIKE ${term})
    )`);
  }
  if (query.categoryId) {
    parts.push(Prisma.sql`p."categoryId" = ${query.categoryId}`);
  }
  if (query.status) {
    parts.push(Prisma.sql`p.status = ${query.status}::"ProductStatus"`);
  }
  if (query.stock === "out") {
    parts.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "Variant" s
      WHERE s."productId" = p.id AND s."isActive" AND s.stock <= 0)`);
  }
  if (query.stock === "low") {
    // TODO(Phase 5): store-wide threshold from Settings → Stock.
    parts.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "Variant" s
      WHERE s."productId" = p.id AND s."isActive" AND s.stock > 0
        AND s.stock <= COALESCE(p."lowStockThreshold", ${DEFAULT_LOW_STOCK_THRESHOLD}))`);
  }
  return Prisma.join(parts, " AND ");
}

function orderSql(sort: ListQuery["sort"]): Prisma.Sql {
  const stock = Prisma.sql`COALESCE(SUM(GREATEST(v.stock, 0)), 0)`;
  switch (sort) {
    case "newest":
      return Prisma.sql`p."createdAt" DESC`;
    case "name":
      return Prisma.sql`lower(p.name) ASC`;
    case "stock_asc":
      return Prisma.sql`${stock} ASC, p."updatedAt" DESC`;
    case "stock_desc":
      return Prisma.sql`${stock} DESC, p."updatedAt" DESC`;
    default:
      return Prisma.sql`p."updatedAt" DESC`;
  }
}

/** Product pages, listings and the home sections that show products. */
function tagsFor(slug: string): string[] {
  return [cacheTags.products, cacheTags.product(slug), cacheTags.home];
}

function notFound() {
  return new NotFoundException({
    message: "Product not found",
    code: "NOT_FOUND",
  });
}

function badRequest(code: string, field: string) {
  return new BadRequestException({
    message: "The product could not be saved",
    code,
    details: { field },
  });
}

function slugTaken() {
  return new ConflictException({
    message: "Another product already uses this URL",
    code: "SLUG_TAKEN",
  });
}

function rethrowSlugTaken(error: unknown): never {
  if (isUniqueViolation(error)) {
    const target = (error as Prisma.PrismaClientKnownRequestError).meta?.target;
    if (String(target ?? "").includes("sku")) {
      throw new ConflictException({
        message: "Another variant already uses this SKU",
        code: "SKU_TAKEN",
      });
    }
    throw slugTaken();
  }
  throw error;
}
