import type { adminProductListQuerySchema } from "@aaarchive/shared/product";
import { DEFAULT_LOW_STOCK_THRESHOLD } from "@aaarchive/shared/stock";
import type { z } from "zod";
import { Prisma } from "../../generated/prisma/client.js";

// The admin list's filters and sort as SQL, shared by the list screen and the
// export so "what you see is what you export" (PRD §6.9 rule 1).

export type ProductFilters = Omit<
  z.output<typeof adminProductListQuerySchema>,
  "page" | "limit"
>;

/** Escapes LIKE wildcards in a search term. */
function likeTerm(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export function whereSql(query: ProductFilters): Prisma.Sql {
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

export function orderSql(sort: ProductFilters["sort"]): Prisma.Sql {
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

/**
 * Product ids matching the filters, in list order; one page when `page` is
 * given. Sorting by stock needs the sum over variants, which Prisma cannot
 * order by, so ids come from SQL and Prisma loads the rows.
 */
export function productIdsSql(
  query: ProductFilters,
  page?: { limit: number; offset: number },
): Prisma.Sql {
  return Prisma.sql`
    SELECT p.id
    FROM "Product" p
    LEFT JOIN "Variant" v ON v."productId" = p.id AND v."isActive"
    WHERE ${whereSql(query)}
    GROUP BY p.id
    ORDER BY ${orderSql(query.sort)}, p.id
    ${page ? Prisma.sql`LIMIT ${page.limit} OFFSET ${page.offset}` : Prisma.empty}`;
}
