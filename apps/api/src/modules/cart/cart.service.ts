import type { CartItemInput } from "@aaarchive/shared/checkout";
import { Injectable } from "@nestjs/common";
import { SettingsService } from "../settings/settings.service.js";
import {
  type CartNoticeCode,
  type StoreCart,
  toStoreCartLine,
} from "./cart.mapper.js";
import { PricingService } from "./pricing.service.js";

/** POST /cart/validate (PRD §5.7): current prices and stock status, with notices. */
@Injectable()
export class CartService {
  constructor(
    private readonly pricing: PricingService,
    private readonly settings: SettingsService,
  ) {}

  async validate(items: readonly CartItemInput[]): Promise<StoreCart> {
    const { maxQtyPerVariant } = await this.settings.stock();
    // Quantities over the store's cap are lowered first (PRD §5.6 rule 4).
    const capped = items.map((i) => ({
      ...i,
      quantity: Math.min(i.quantity, maxQtyPerVariant),
    }));
    const { lines, unavailable } = await this.pricing.price(capped);

    const notices: StoreCart["notices"] = unavailable.map((variantId) => ({
      variantId,
      code: "UNAVAILABLE",
    }));
    let subtotal = 0;
    for (const [n, line] of lines.entries()) {
      const sent = items.find((i) => i.variantId === line.variantId);
      let code: CartNoticeCode | null = null;
      if (line.stock <= 0) code = "OUT_OF_STOCK";
      else if (line.stock < line.quantity) code = "NOT_ENOUGH_STOCK";
      else if (sent && sent.quantity > line.quantity) code = "QTY_LIMITED";
      if (code) notices.push({ variantId: line.variantId, code });
      if (code !== "OUT_OF_STOCK" && code !== "NOT_ENOUGH_STOCK") {
        subtotal += lines[n].lineTotal;
      }
    }
    return {
      items: lines.map(toStoreCartLine),
      notices,
      subtotal,
      maxQtyPerVariant,
    };
  }
}
