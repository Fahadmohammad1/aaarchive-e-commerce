import type {
  storeProductListQuerySchema,
  storeSearchQuerySchema,
} from "@aaarchive/shared/storefront";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { z } from "zod";
import { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { MediaService } from "../media/media.service.js";
import { SettingsService } from "../settings/settings.service.js";
import {
  type StoreProduct,
  type StoreProductStock,
  storeProductInclude,
  storeSummaryInclude,
  toStoreProduct,
  toStoreProductStock,
  toStoreProductSummary,
} from "./store-products.mapper.js";

type ListQuery = z.output<typeof storeProductListQuerySchema>;
type SearchQuery = z.output<typeof storeSearchQuerySchema>;

/** The price a customer pays now: the sale price inside its window. */
const CURRENT_PRICE = Prisma.sql`(CASE
  WHEN p."salePrice" IS NOT NULL AND p."salePrice" < p."basePrice"
    AND (p."saleStart" IS NULL OR p."saleStart" <= now())
    AND (p."saleEnd" IS NULL OR p."saleEnd" > now())
  THEN p."salePrice" ELSE p."basePrice" END)`;

/** Units sold, not counting cancelled or returned orders. */
const UNITS_SOLD = Prisma.sql`(
  SELECT COALESCE(SUM(oi.quantity), 0)
  FROM "OrderItem" oi
  JOIN "Variant" sv ON sv.id = oi."variantId"
  JOIN "Order" o ON o.id = oi."orderId"
  WHERE sv."productId" = p.id AND o.status NOT IN ('CANCELLED', 'RETURNED'))`;

const PUBLISHED = Prisma.sql`p.status = 'PUBLISHED'::"ProductStatus"`;

function likeTerm(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

function lower(values: string[] | undefined): string[] | undefined {
  return values?.length ? values.map((v) => v.toLowerCase()) : undefined;
}

/** Published products matching the shop filters (PRD §5.3). */
function listWhere(query: ListQuery): Prisma.Sql {
  const parts: Prisma.Sql[] = [PUBLISHED];
  if (query.category) parts.push(Prisma.sql`c.slug = ${query.category}`);
  if (query.collection) {
    parts.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "ProductCollection" pc
      JOIN "Collection" co ON co.id = pc."collectionId"
      WHERE pc."productId" = p.id AND co.slug = ${query.collection} AND co."isActive")`);
  }
  if (query.exclude) parts.push(Prisma.sql`p.slug <> ${query.exclude}`);
  if (query.minPrice !== undefined) {
    parts.push(Prisma.sql`${CURRENT_PRICE} >= ${query.minPrice}`);
  }
  if (query.maxPrice !== undefined) {
    parts.push(Prisma.sql`${CURRENT_PRICE} <= ${query.maxPrice}`);
  }
  // Size, colour and "in stock" must hold for one and the same variant:
  // "M in Black, available" — not M in one colour and Black in another.
  const sizes = lower(query.size);
  const colors = lower(query.color);
  if (sizes || colors || query.inStock) {
    const variant: Prisma.Sql[] = [
      Prisma.sql`v."productId" = p.id AND v."isActive"`,
    ];
    if (sizes) {
      variant.push(Prisma.sql`EXISTS (SELECT 1 FROM "Size" s
        WHERE s.id = v."sizeId" AND lower(s.name) = ANY(${sizes}::text[]))`);
    }
    if (colors) {
      variant.push(Prisma.sql`EXISTS (SELECT 1 FROM "Color" k
        WHERE k.id = v."colorId" AND lower(k.name) = ANY(${colors}::text[]))`);
    }
    if (query.inStock) variant.push(Prisma.sql`v.stock > 0`);
    parts.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "Variant" v WHERE ${Prisma.join(variant, " AND ")})`,
    );
  }
  return Prisma.join(parts, " AND ");
}

function listOrder(sort: ListQuery["sort"]): Prisma.Sql {
  switch (sort) {
    case "price_asc":
      return Prisma.sql`${CURRENT_PRICE} ASC, p."createdAt" DESC`;
    case "price_desc":
      return Prisma.sql`${CURRENT_PRICE} DESC, p."createdAt" DESC`;
    case "best_selling":
      return Prisma.sql`${UNITS_SOLD} DESC, p."createdAt" DESC`;
    default:
      return Prisma.sql`p."createdAt" DESC`;
  }
}

/** Public catalog reads (PRD §5.3–5.5). Everything here is cacheable except `stock()`. */
@Injectable()
export class StoreProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly settings: SettingsService,
  ) {}

  async list(query: ListQuery) {
    const { page, limit } = query;
    const where = listWhere(query);
    const [ids, [{ total }]] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT p.id FROM "Product" p
        JOIN "Category" c ON c.id = p."categoryId"
        WHERE ${where}
        ORDER BY ${listOrder(query.sort)}, p.id
        LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      this.prisma.$queryRaw<{ total: number }[]>`
        SELECT count(*)::int AS total FROM "Product" p
        JOIN "Category" c ON c.id = p."categoryId"
        WHERE ${where}`,
    ]);
    return {
      data: await this.summaries(ids.map((r) => r.id)),
      meta: { page, limit, total },
    };
  }

  /**
   * Name, category, tags and SKU (PRD §5.4): full-text for whole words,
   * trigrams for typos ("hodie" → hoodie), ILIKE for partial words and SKUs.
   */
  async search({ q, page, limit }: SearchQuery) {
    const like = likeTerm(q);
    const doc = Prisma.sql`to_tsvector('simple',
      p.name || ' ' || c.name || ' ' || array_to_string(p.tags, ' '))`;
    const query = Prisma.sql`websearch_to_tsquery('simple', ${q})`;
    const where = Prisma.sql`${PUBLISHED} AND (
      ${doc} @@ ${query}
      OR p.name % ${q} OR ${q} <% p.name
      OR p.name ILIKE ${like} OR c.name ILIKE ${like}
      OR EXISTS (SELECT 1 FROM unnest(p.tags) t WHERE t ILIKE ${like})
      OR EXISTS (SELECT 1 FROM "Variant" v
        WHERE v."productId" = p.id AND v."isActive" AND v.sku ILIKE ${like}))`;
    const [ids, [{ total }]] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>`
        SELECT p.id FROM "Product" p
        JOIN "Category" c ON c.id = p."categoryId"
        WHERE ${where}
        ORDER BY ts_rank(${doc}, ${query}) + similarity(p.name, ${q}) DESC,
          p."createdAt" DESC, p.id
        LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      this.prisma.$queryRaw<{ total: number }[]>`
        SELECT count(*)::int AS total FROM "Product" p
        JOIN "Category" c ON c.id = p."categoryId"
        WHERE ${where}`,
    ]);
    return {
      data: await this.summaries(ids.map((r) => r.id)),
      meta: { page, limit, total },
    };
  }

  /** Sizes, colours and price range on offer, for the shop's filter panel. */
  async filters(scope: { category?: string; collection?: string }) {
    const product: Prisma.ProductWhereInput = {
      status: "PUBLISHED",
      ...(scope.category && { category: { slug: scope.category } }),
      ...(scope.collection && {
        collections: {
          some: { collection: { slug: scope.collection, isActive: true } },
        },
      }),
    };
    const variant = { isActive: true, product };
    const [sizes, colors, prices] = await Promise.all([
      this.prisma.size.findMany({
        where: { variants: { some: variant } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { name: true },
      }),
      this.prisma.color.findMany({
        where: { variants: { some: variant } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { name: true, hex: true },
      }),
      this.prisma.$queryRaw<{ min: number | null; max: number | null }[]>`
        SELECT min(${CURRENT_PRICE})::int AS min, max(${CURRENT_PRICE})::int AS max
        FROM "Product" p JOIN "Category" c ON c.id = p."categoryId"
        WHERE ${listWhere({ ...scope, sort: "newest", page: 1, limit: 1 })}`,
    ]);
    const [range] = prices;
    return {
      sizes: sizes.map((s) => s.name),
      colors,
      price: { min: range?.min ?? 0, max: range?.max ?? 0 },
    };
  }

  async get(slug: string): Promise<StoreProduct> {
    const row = await this.prisma.product.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: storeProductInclude,
    });
    if (!row) throw notFound();
    const { maxQtyPerVariant } = await this.settings.stock();
    return toStoreProduct(row, this.media, new Date(), maxQtyPerVariant);
  }

  /** Per-variant status, read at request time (never cached, PRD §8.2). */
  async stock(slug: string): Promise<StoreProductStock> {
    const row = await this.prisma.product.findFirst({
      where: { slug, status: "PUBLISHED" },
      select: {
        lowStockThreshold: true,
        variants: {
          where: { isActive: true },
          select: { id: true, stock: true },
        },
      },
    });
    if (!row) throw notFound();
    const { lowStockThreshold } = await this.settings.stock();
    return toStoreProductStock(row, lowStockThreshold);
  }

  /** Loads cards for ids, keeping the order the SQL chose. */
  private async summaries(ids: string[]) {
    if (ids.length === 0) return [];
    const rows = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      include: storeSummaryInclude,
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    return ids
      .map((id) => byId.get(id))
      .filter((r) => r !== undefined)
      .map((r) => toStoreProductSummary(r, this.media));
  }
}

function notFound() {
  return new NotFoundException({
    message: "Product not found",
    code: "NOT_FOUND",
  });
}
