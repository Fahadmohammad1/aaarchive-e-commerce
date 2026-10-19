import type { MediaAsset } from "@aaarchive/shared/media";
import type { StockStatus } from "@aaarchive/shared/stock";

// Response of POST /cart/validate (apps/api cart.mapper.ts). Never a stock number.

export type CartNoticeCode =
  | "UNAVAILABLE"
  | "OUT_OF_STOCK"
  | "NOT_ENOUGH_STOCK"
  | "QTY_LIMITED";

export type CartImage = { media: MediaAsset; alt: string };

export type ValidatedCartLine = {
  variantId: string;
  product: { slug: string; name: string };
  sizeName: string;
  colorName: string;
  image: CartImage | null;
  unitPrice: number;
  compareAt: number | null;
  quantity: number;
  lineTotal: number;
  stockStatus: StockStatus;
};

export type ValidatedCart = {
  items: ValidatedCartLine[];
  notices: Array<{ variantId: string; code: CartNoticeCode }>;
  subtotal: number;
  maxQtyPerVariant: number;
};
