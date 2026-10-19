import type { CartItemInput } from "@aaarchive/shared/checkout";
import type { MediaAsset } from "@aaarchive/shared/media";
import { type StockStatus, stockStatusFor } from "@aaarchive/shared/stock";
import { variantPrice } from "@aaarchive/shared/storefront";
import { Injectable } from "@nestjs/common";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { MediaService } from "../media/media.service.js";
import { thresholdOf } from "../products/products.mapper.js";
import { SettingsService } from "../settings/settings.service.js";

// The single place that turns { variantId, quantity } into money (golden
// rule 2): cart validation, coupon apply and order placement all price
// through here, from the database, with the same variantPrice() rule.

const variantSelect = {
  id: true,
  sku: true,
  stock: true,
  isActive: true,
  priceOverride: true,
  colorId: true,
  size: { select: { name: true } },
  color: { select: { name: true } },
  product: {
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
      categoryId: true,
      basePrice: true,
      salePrice: true,
      saleStart: true,
      saleEnd: true,
      lowStockThreshold: true,
      images: {
        select: { alt: true, colorId: true, media: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  },
} as const satisfies Prisma.VariantSelect;

type VariantRow = Prisma.VariantGetPayload<{ select: typeof variantSelect }>;

/**
 * One priced cart line. INTERNAL: `stock` is here for the checks and must
 * never be copied into a response (PRD §5.6) — public shapes are built
 * field by field in cart.mapper.ts.
 */
export type PricedLine = {
  variantId: string;
  productId: string;
  categoryId: string;
  productSlug: string;
  productName: string;
  sizeName: string;
  colorName: string;
  sku: string;
  image: { media: MediaAsset; alt: string } | null;
  unitPrice: number;
  compareAt: number | null;
  quantity: number;
  lineTotal: number;
  stock: number;
  stockStatus: StockStatus;
};

export type PricedCart = {
  lines: PricedLine[];
  /** Ids that no longer exist, were switched off or whose product is not published. */
  unavailable: string[];
};

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly settings: SettingsService,
  ) {}

  /** Prices the items in the order given; quantities are taken as sent. */
  async price(
    items: readonly CartItemInput[],
    now: Date = new Date(),
  ): Promise<PricedCart> {
    if (items.length === 0) return { lines: [], unavailable: [] };
    const rows = await this.prisma.variant.findMany({
      where: { id: { in: items.map((i) => i.variantId) } },
      select: variantSelect,
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const { lowStockThreshold } = await this.settings.stock();
    const lines: PricedLine[] = [];
    const unavailable: string[] = [];
    for (const item of items) {
      const row = byId.get(item.variantId);
      if (!row?.isActive || row.product.status !== "PUBLISHED") {
        unavailable.push(item.variantId);
        continue;
      }
      lines.push(this.line(row, item.quantity, now, lowStockThreshold));
    }
    return { lines, unavailable };
  }

  private line(
    row: VariantRow,
    quantity: number,
    now: Date,
    storeThreshold: number,
  ): PricedLine {
    const { price, compareAt } = variantPrice(row.product, row, now);
    // The photo of this colour, else the product's first photo.
    const image =
      row.product.images.find((i) => i.colorId === row.colorId) ??
      row.product.images[0];
    return {
      variantId: row.id,
      productId: row.product.id,
      categoryId: row.product.categoryId,
      productSlug: row.product.slug,
      productName: row.product.name,
      sizeName: row.size.name,
      colorName: row.color.name,
      sku: row.sku,
      image: image
        ? { media: this.media.toDto(image.media), alt: image.alt ?? "" }
        : null,
      unitPrice: price,
      compareAt,
      quantity,
      lineTotal: price * quantity,
      stock: row.stock,
      stockStatus: stockStatusFor(
        row.stock,
        thresholdOf(row.product, storeThreshold),
      ),
    };
  }
}

export function subtotalOf(lines: readonly PricedLine[]): number {
  return lines.reduce((sum, l) => sum + l.lineTotal, 0);
}
