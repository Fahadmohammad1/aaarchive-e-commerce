import {
  type CourierSettings,
  courierSettingsSchema,
  type DeliverySettings,
  deliverySettingsSchema,
  type PaymentSettings,
  paymentSettingsSchema,
  type StockSettings,
  stockSettingsSchema,
  walletAvailable,
} from "@aaarchive/shared/settings";
import { Injectable, Logger } from "@nestjs/common";
import type { z } from "zod";
import { PrismaService } from "../../prisma/prisma.service.js";

/** What the storefront may know about the store's settings (PRD §6.8). */
export type PublicSettings = {
  payments: {
    cod: { enabled: boolean };
    bkash: { enabled: boolean; number: string; instructions: string };
    nagad: { enabled: boolean; number: string; instructions: string };
    codAdvanceDeliveryCharge: boolean;
  };
  delivery: { freeDeliveryThreshold: number | null };
  stock: { maxQtyPerVariant: number };
};

/**
 * Reads `Setting` rows through their shared schemas, so a missing or
 * half-filled row still yields a complete value. Editing arrives with the
 * Settings screens (Phase 6).
 */
@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  payments(): Promise<PaymentSettings> {
    return this.read("payments", paymentSettingsSchema);
  }

  stock(): Promise<StockSettings> {
    return this.read("stock", stockSettingsSchema);
  }

  delivery(): Promise<DeliverySettings> {
    return this.read("delivery", deliverySettingsSchema);
  }

  couriers(): Promise<CourierSettings> {
    return this.read("couriers", courierSettingsSchema);
  }

  /** Whole list replaced (OWNER; validated by the controller). */
  async saveCouriers(value: CourierSettings): Promise<CourierSettings> {
    await this.prisma.setting.upsert({
      where: { key: "couriers" },
      update: { value },
      create: { key: "couriers", value },
    });
    return value;
  }

  async publicSettings(): Promise<PublicSettings> {
    const [payments, delivery, stock] = await Promise.all([
      this.payments(),
      this.delivery(),
      this.stock(),
    ]);
    // A wallet without a number cannot be paid, so it is shown as off.
    const wallet = (w: PaymentSettings["bkash"]) => ({
      enabled: walletAvailable(w),
      number: w.number,
      instructions: w.instructions,
    });
    return {
      payments: {
        cod: { enabled: payments.cod.enabled },
        bkash: wallet(payments.bkash),
        nagad: wallet(payments.nagad),
        codAdvanceDeliveryCharge: payments.codAdvanceDeliveryCharge,
      },
      delivery: { freeDeliveryThreshold: delivery.freeDeliveryThreshold },
      stock: { maxQtyPerVariant: stock.maxQtyPerVariant },
    };
  }

  private async read<S extends z.ZodType>(
    key: string,
    schema: S,
  ): Promise<z.output<S>> {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    const parsed = schema.safeParse(row?.value ?? {});
    if (parsed.success) return parsed.data;
    // A bad row must not take checkout down: fall back to the defaults.
    this.logger.error(`Setting "${key}" is invalid; using defaults`);
    return schema.parse({});
  }
}
