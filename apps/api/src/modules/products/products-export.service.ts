import { Injectable } from "@nestjs/common";
import type { Response } from "express";
import { ExportService } from "../../common/export/export.service.js";
import type { ExportColumn } from "../../common/export/export-columns.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { SettingsService } from "../settings/settings.service.js";
import { type ProductFilters, productIdsSql } from "./products.query.js";

const variantInclude = {
  product: {
    select: {
      name: true,
      status: true,
      basePrice: true,
      salePrice: true,
      category: { select: { name: true } },
    },
  },
  size: { select: { name: true, sortOrder: true } },
  color: { select: { name: true, sortOrder: true } },
} as const satisfies Prisma.VariantInclude;

type VariantRow = Prisma.VariantGetPayload<{ include: typeof variantInclude }>;

const STATUS: Record<string, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

/** Products & stock export, one row per variant (PRD §6.9). Owner only. */
const columns: ExportColumn<VariantRow>[] = [
  { header: "Product", type: "text", width: 32, value: (v) => v.product.name },
  {
    header: "Category",
    type: "text",
    width: 16,
    value: (v) => v.product.category.name,
  },
  { header: "SKU", type: "text", width: 26, value: (v) => v.sku },
  { header: "Size", type: "text", width: 8, value: (v) => v.size.name },
  { header: "Colour", type: "text", width: 14, value: (v) => v.color.name },
  { header: "Stock", type: "number", width: 8, value: (v) => v.stock },
  {
    header: "Price",
    type: "money",
    width: 10,
    value: (v) => v.priceOverride ?? v.product.basePrice,
  },
  {
    header: "Sale price",
    type: "money",
    width: 10,
    // The product's sale price; how it combines with a variant's own price
    // is decided with checkout pricing (Phase 4).
    value: (v) => v.product.salePrice,
  },
  {
    header: "Status",
    type: "text",
    width: 11,
    value: (v) => STATUS[v.product.status],
  },
  {
    header: "Variant on sale",
    type: "text",
    width: 9,
    value: (v) => (v.isActive ? "Yes" : "No"),
  },
];

const PRODUCTS_PER_BATCH = 200;

@Injectable()
export class ProductsExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exporter: ExportService,
    private readonly settings: SettingsService,
  ) {}

  async export(
    res: Response,
    query: ProductFilters & { format: "csv" | "xlsx" },
  ): Promise<void> {
    const ids = (
      await this.prisma.$queryRaw<{ id: string }[]>(
        productIdsSql(
          query,
          undefined,
          (
            await this.settings.stock()
          ).lowStockThreshold,
        ),
      )
    ).map((r) => r.id);
    const total = ids.length
      ? await this.prisma.variant.count({ where: { productId: { in: ids } } })
      : 0;
    await this.exporter.stream(res, {
      resource: "products",
      format: query.format,
      columns,
      total,
      rows: this.rows(ids),
    });
  }

  /** Variants in list order: product, then colour, then size. */
  private async *rows(ids: string[]): AsyncGenerator<VariantRow> {
    for (let i = 0; i < ids.length; i += PRODUCTS_PER_BATCH) {
      const batch = ids.slice(i, i + PRODUCTS_PER_BATCH);
      const position = new Map(batch.map((id, n) => [id, n]));
      const variants = await this.prisma.variant.findMany({
        where: { productId: { in: batch } },
        include: variantInclude,
      });
      variants.sort(
        (a, b) =>
          (position.get(a.productId) ?? 0) - (position.get(b.productId) ?? 0) ||
          a.color.sortOrder - b.color.sortOrder ||
          a.color.name.localeCompare(b.color.name) ||
          a.size.sortOrder - b.size.sortOrder ||
          a.size.name.localeCompare(b.size.name),
      );
      yield* variants;
    }
  }
}
