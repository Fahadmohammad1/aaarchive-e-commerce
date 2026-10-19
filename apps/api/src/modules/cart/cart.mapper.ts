import type { MediaAsset } from "@aaarchive/shared/media";
import type { StockStatus } from "@aaarchive/shared/stock";
import type { PricedLine } from "./pricing.service.js";

// PUBLIC cart shapes: fields picked one by one, never a stock number
// (PRD §5.6). cart.mapper.spec.ts checks it.

export type CartNoticeCode =
  /** Gone, switched off or unpublished: removed from the cart. */
  | "UNAVAILABLE"
  | "OUT_OF_STOCK"
  /** More than is left: the generic message, never the number. */
  | "NOT_ENOUGH_STOCK"
  /** Lowered to the store's per-variant maximum. */
  | "QTY_LIMITED";

export type StoreCartLine = {
  variantId: string;
  product: { slug: string; name: string };
  sizeName: string;
  colorName: string;
  image: { media: MediaAsset; alt: string } | null;
  unitPrice: number;
  compareAt: number | null;
  quantity: number;
  lineTotal: number;
  stockStatus: StockStatus;
};

export type StoreCart = {
  items: StoreCartLine[];
  notices: Array<{ variantId: string; code: CartNoticeCode }>;
  /** Lines that can be ordered as they are (out-of-stock lines excluded). */
  subtotal: number;
  maxQtyPerVariant: number;
};

export function toStoreCartLine(line: PricedLine): StoreCartLine {
  return {
    variantId: line.variantId,
    product: { slug: line.productSlug, name: line.productName },
    sizeName: line.sizeName,
    colorName: line.colorName,
    image: line.image,
    unitPrice: line.unitPrice,
    compareAt: line.compareAt,
    quantity: line.quantity,
    lineTotal: line.lineTotal,
    stockStatus: line.stockStatus,
  };
}
