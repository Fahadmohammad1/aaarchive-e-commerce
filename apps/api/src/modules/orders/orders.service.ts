import { cacheTags } from "@aaarchive/shared/cache-tags";
import type {
  CheckoutValues,
  checkoutSchema,
  trackOrderSchema,
} from "@aaarchive/shared/checkout";
import { deliveryChargeFor } from "@aaarchive/shared/delivery";
import {
  type PaymentSettings,
  walletAvailable,
} from "@aaarchive/shared/settings";
import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { z } from "zod";
import type { RequestUser } from "../../common/auth/request-user.js";
import { isUniqueViolation } from "../../common/prisma/prisma-errors.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AddressesService } from "../account/addresses.service.js";
import { TurnstileService } from "../auth/turnstile.service.js";
import {
  type PricedLine,
  PricingService,
  subtotalOf,
} from "../cart/pricing.service.js";
import { CouponsService, couponError } from "../coupons/coupons.service.js";
import { DeliveryZonesService } from "../delivery-zones/delivery-zones.service.js";
import { MailService } from "../mail/mail.service.js";
import { RevalidationService } from "../revalidation/revalidation.service.js";
import { SettingsService } from "../settings/settings.service.js";
import { SslcommerzService } from "../sslcommerz/sslcommerz.service.js";
import { orderConfirmationMail } from "./order-mail.js";
import {
  type PublicOrder,
  publicOrderSelect,
  toPublicOrder,
} from "./orders.mapper.js";

/** The public shape plus the payment record's id (SSLCommerz's tran_id). */
const placedOrderSelect = {
  ...publicOrderSelect,
  payments: {
    ...publicOrderSelect.payments,
    select: { ...publicOrderSelect.payments.select, id: true },
  },
} as const;

/** Orders per phone per hour (PRD §5.8); the per-IP limit is on the route. */
export const ORDERS_PER_PHONE_PER_HOUR = 3;

/** The one over-quantity message customers ever see (PRD §5.6 rule 5). */
export const OUT_OF_STOCK_MESSAGE =
  "Not enough stock for this quantity. Please try a smaller amount.";

export function outOfStock(variantIds: string[]) {
  return new UnprocessableEntityException({
    message: OUT_OF_STOCK_MESSAGE,
    code: "OUT_OF_STOCK",
    details: { variantIds },
  });
}

type PaymentPlan = {
  paymentStatus: "UNPAID" | "PENDING_VERIFICATION";
  record: {
    method: "BKASH" | "NAGAD" | "SSLCOMMERZ";
    amount: number;
    /** Wallets only; SSLCommerz is confirmed by its validation API. */
    senderNumber: string | null;
    trxId: string | null;
  } | null;
};

/** POST /orders answer. Online payment adds the SSLCommerz page to go to. */
export type PlacedOrder = PublicOrder & { paymentUrl?: string };

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly coupons: CouponsService,
    private readonly zones: DeliveryZonesService,
    private readonly settings: SettingsService,
    private readonly turnstile: TurnstileService,
    private readonly mail: MailService,
    private readonly revalidation: RevalidationService,
    private readonly sslcommerz: SslcommerzService,
    private readonly addresses: AddressesService,
  ) {}

  /**
   * POST /orders — PRD §8.4. Checks first (bot, method, blocklist, limits,
   * zone), then prices everything from the database, then one transaction
   * claims stock and the coupon and writes the order. Email after commit.
   */
  async place(
    input: z.output<typeof checkoutSchema>,
    ip: string | undefined,
    user?: RequestUser,
  ): Promise<PlacedOrder> {
    await this.turnstile.verify(input.turnstileToken, ip);
    // Unpaid online orders past their window give their stock back first.
    void this.sslcommerz.expireStale();
    // A signed-in customer's order joins their account (PRD §5.10).
    const userId = user?.role === "CUSTOMER" ? user.id : null;

    const [payments, stockSettings, delivery] = await Promise.all([
      this.settings.payments(),
      this.settings.stock(),
      this.settings.delivery(),
    ]);
    assertMethodAvailable(
      input.payment.method,
      payments,
      this.sslcommerz.configured,
    );
    await this.assertNotBlocked(input);
    await this.assertPhoneRate(input.phone);

    const zone = await this.zones.findActive(input.zoneId);
    if (!zone) {
      throw new UnprocessableEntityException({
        message: "Please choose a delivery zone",
        code: "ZONE_UNAVAILABLE",
      });
    }

    // Over the per-variant cap: refused, never silently lowered at checkout.
    if (input.items.some((i) => i.quantity > stockSettings.maxQtyPerVariant)) {
      throw new UnprocessableEntityException({
        message: `You can order up to ${stockSettings.maxQtyPerVariant} of each item`,
        code: "QTY_LIMIT",
        details: { max: stockSettings.maxQtyPerVariant },
      });
    }

    const { lines, unavailable } = await this.pricing.price(input.items);
    if (unavailable.length > 0) {
      throw new UnprocessableEntityException({
        message: "Some items are no longer available",
        code: "ITEM_UNAVAILABLE",
        details: { variantIds: unavailable },
      });
    }
    // Early, friendly answer; the transaction below is the real guard.
    const short = lines.filter((l) => l.stock < l.quantity);
    if (short.length > 0) throw outOfStock(short.map((l) => l.variantId));

    const subtotal = subtotalOf(lines);
    const applied = input.couponCode
      ? await this.coupons.evaluate(input.couponCode, lines, input.phone)
      : null;
    const discount = applied?.discount ?? 0;
    const deliveryCharge = deliveryChargeFor(
      zone.charge,
      subtotal - discount,
      delivery.freeDeliveryThreshold,
    );
    const total = subtotal - discount + deliveryCharge;
    const plan = paymentPlan(input, payments, total, deliveryCharge);

    if (plan.record?.trxId) await this.assertTrxIdUnused(plan.record.trxId);

    const { paymentId, ...order } = await this.prisma
      .$transaction(async (tx) => {
        await claimStock(tx, lines);
        if (applied) await claimCoupon(tx, applied.coupon.id);
        const [{ n }] = await tx.$queryRaw<{ n: bigint }[]>`
          select nextval('order_number_seq') as n`;
        const created = await tx.order.create({
          data: {
            orderNumber: `AAR-${n}`,
            userId,
            customerName: input.name,
            phone: input.phone,
            altPhone: input.altPhone ?? null,
            email: input.email ?? null,
            zoneId: zone.id,
            district: input.district,
            area: input.area,
            address: input.address,
            note: input.note ?? null,
            subtotal,
            discount,
            deliveryCharge,
            total,
            couponCode: applied?.coupon.code ?? null,
            paymentMethod: input.payment.method,
            paymentStatus: plan.paymentStatus,
            items: {
              create: lines.map((l) => ({
                variantId: l.variantId,
                productName: l.productName,
                sizeName: l.sizeName,
                colorName: l.colorName,
                sku: l.sku,
                unitPrice: l.unitPrice,
                quantity: l.quantity,
                lineTotal: l.lineTotal,
              })),
            },
            ...(plan.record ? { payments: { create: plan.record } } : {}),
            events: { create: { type: "STATUS", to: "PENDING" } },
          },
          select: placedOrderSelect,
        });
        // The order's one payment record; SSLCommerz uses its id as tran_id.
        return { ...created, paymentId: created.payments[0]?.id ?? null };
      })
      .catch((error: unknown) => {
        // Two orders racing with the same TrxID: the unique index decides.
        if (isUniqueViolation(error)) throw trxIdUsed();
        throw error;
      });

    this.logger.log(`Order placed: ${order.orderNumber}`);
    const result = toPublicOrder(order);
    void this.afterPlaced(result, input, lines, userId);

    if (input.payment.method === "SSLCOMMERZ" && paymentId) {
      const paymentUrl = await this.sslcommerz.startPayment({
        orderNumber: order.orderNumber,
        paymentId,
        total,
        itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
        customerName: input.name,
        email: input.email ?? null,
        phone: input.phone,
        address: input.address,
        district: input.district,
      });
      return { ...result, paymentUrl };
    }
    return result;
  }

  /** POST /orders/track (PRD §5.9): phone and number must both match. */
  async track(input: z.output<typeof trackOrderSchema>): Promise<PublicOrder> {
    const order = await this.prisma.order.findFirst({
      where: { orderNumber: input.orderNumber, phone: input.phone },
      select: publicOrderSelect,
    });
    if (!order) {
      // Same answer whichever half was wrong, so numbers cannot be probed.
      throw new NotFoundException({
        message: "No order matches this phone number and order number",
        code: "ORDER_NOT_FOUND",
      });
    }
    const { couriers } = await this.settings.couriers();
    return toPublicOrder(order, couriers);
  }

  private async assertNotBlocked(input: CheckoutValues) {
    // PRD §5.8: blocked phones can still pay in advance by bKash/Nagad.
    if (input.payment.method !== "COD") return;
    const blocked = await this.prisma.blockedPhone.findUnique({
      where: { phone: input.phone },
      select: { id: true },
    });
    if (blocked) {
      throw new UnprocessableEntityException({
        message:
          "Cash on Delivery is not available for this number. Please pay by bKash or Nagad.",
        code: "PHONE_BLOCKED",
      });
    }
  }

  private async assertPhoneRate(phone: string) {
    const recent = await this.prisma.order.count({
      where: { phone, createdAt: { gte: new Date(Date.now() - 3_600_000) } },
    });
    if (recent >= ORDERS_PER_PHONE_PER_HOUR) {
      throw new HttpException(
        {
          message: "Too many orders from this number. Please try again later.",
          code: "RATE_LIMITED",
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private async assertTrxIdUnused(trxId: string) {
    const used = await this.prisma.payment.findUnique({
      where: { trxId },
      select: { id: true },
    });
    if (used) throw trxIdUsed();
  }

  /** Side effects after commit: never fail the order (rules.md §4.3). */
  private async afterPlaced(
    order: PublicOrder,
    input: CheckoutValues,
    lines: PricedLine[],
    userId: string | null,
  ) {
    try {
      // A variant that just sold out changes listings ("Out of Stock").
      const soldOut = await this.prisma.variant.findMany({
        where: { id: { in: lines.map((l) => l.variantId) }, stock: { lte: 0 } },
        select: { product: { select: { slug: true } } },
      });
      if (soldOut.length > 0) {
        const slugs = new Set(soldOut.map((v) => v.product.slug));
        await this.revalidation.revalidate([
          cacheTags.products,
          ...[...slugs].map(cacheTags.product),
        ]);
      }
      if (userId && input.saveAddress) {
        await this.addresses.saveFromCheckout(userId, {
          name: input.name,
          phone: input.phone,
          zoneId: input.zoneId,
          district: input.district,
          area: input.area,
          address: input.address,
          isDefault: false,
        });
      }
      // Online payment: the confirmation goes out once SSLCommerz confirms it.
      if (input.email && input.payment.method !== "SSLCOMMERZ") {
        await this.mail.send(
          orderConfirmationMail(order, input.name, input.email),
          order.orderNumber,
        );
      }
    } catch (error) {
      this.logger.error(
        `After-order tasks failed for ${order.orderNumber}: ${String(error)}`,
      );
    }
  }
}

/**
 * Per item: `UPDATE … SET stock = stock - qty WHERE id = ? AND stock >= qty`.
 * Zero rows means someone else got there first → abort everything
 * (PRD §5.6 rule 6, §8.4). Sorted by id so concurrent orders lock rows in
 * the same order and cannot deadlock.
 */
export async function claimStock(
  tx: Prisma.TransactionClient,
  lines: readonly PricedLine[],
) {
  const sorted = [...lines].sort((a, b) =>
    a.variantId.localeCompare(b.variantId),
  );
  for (const line of sorted) {
    const { count } = await tx.variant.updateMany({
      where: { id: line.variantId, stock: { gte: line.quantity } },
      data: { stock: { decrement: line.quantity } },
    });
    if (count === 0) throw outOfStock([line.variantId]);
  }
}

/** Takes one use of the coupon, unless its limit was reached meanwhile. */
async function claimCoupon(tx: Prisma.TransactionClient, couponId: string) {
  const claimed = await tx.$executeRaw`
    update "Coupon"
       set "usedCount" = "usedCount" + 1, "updatedAt" = now()
     where id = ${couponId}
       and "isActive"
       and ("usageLimit" is null or "usedCount" < "usageLimit")`;
  if (claimed === 0) throw couponError("COUPON_LIMIT_REACHED");
}

function assertMethodAvailable(
  method: CheckoutValues["payment"]["method"],
  payments: PaymentSettings,
  sslcommerzConfigured = false,
) {
  const available =
    method === "COD"
      ? payments.cod.enabled
      : method === "SSLCOMMERZ"
        ? payments.sslcommerz.enabled && sslcommerzConfigured
        : walletAvailable(method === "BKASH" ? payments.bkash : payments.nagad);
  if (!available) {
    throw new UnprocessableEntityException({
      message: "This payment method is not available right now",
      code: "PAYMENT_METHOD_UNAVAILABLE",
    });
  }
}

/** Which payment record the order gets, and its starting payment status. */
function paymentPlan(
  input: CheckoutValues,
  payments: PaymentSettings,
  total: number,
  deliveryCharge: number,
): PaymentPlan {
  const p = input.payment;
  if (p.method === "SSLCOMMERZ") {
    // Paid on SSLCommerz's page after the order exists (sslcommerz.service).
    return {
      paymentStatus: "UNPAID",
      record: {
        method: "SSLCOMMERZ",
        amount: total,
        senderNumber: null,
        trxId: null,
      },
    };
  }
  if (p.method !== "COD") {
    return {
      paymentStatus: "PENDING_VERIFICATION",
      record: {
        method: p.method,
        amount: total,
        senderNumber: p.senderNumber,
        trxId: p.trxId,
      },
    };
  }
  // PRD §5.8: optionally the delivery charge is paid in advance for COD.
  if (!payments.codAdvanceDeliveryCharge || deliveryCharge === 0) {
    return { paymentStatus: "UNPAID", record: null };
  }
  if (!p.advance) {
    throw new BadRequestException({
      message: "Please pay the delivery charge in advance",
      code: "VALIDATION_ERROR",
      details: { fieldErrors: { "payment.advance": ["REQUIRED"] } },
    });
  }
  assertMethodAvailable(p.advance.method, payments);
  return {
    paymentStatus: "PENDING_VERIFICATION",
    record: {
      method: p.advance.method,
      amount: deliveryCharge,
      senderNumber: p.advance.senderNumber,
      trxId: p.advance.trxId,
    },
  };
}

function trxIdUsed() {
  return new ConflictException({
    message: "This transaction ID has already been used",
    code: "TRXID_ALREADY_USED",
  });
}
