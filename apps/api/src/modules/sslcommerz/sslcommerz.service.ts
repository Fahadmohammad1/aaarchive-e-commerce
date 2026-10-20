import { cacheTags } from "@aaarchive/shared/cache-tags";
import { BadGatewayException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { isUniqueViolation } from "../../common/prisma/prisma-errors.js";
import type { Env } from "../../config/env.schema.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { MailService } from "../mail/mail.service.js";
import { orderConfirmationMail } from "../orders/order-mail.js";
import { publicOrderSelect, toPublicOrder } from "../orders/orders.mapper.js";
import { restoreStock } from "../orders/restore-stock.js";
import { RevalidationService } from "../revalidation/revalidation.service.js";
import { SslcommerzClient } from "./sslcommerz.client.js";
import { judgeValidation, paidValIdFrom } from "./sslcommerz-validation.js";

/** Where the customer's browser goes after the gateway. */
export type PaymentResult =
  | { outcome: "paid" | "review"; orderNumber: string }
  | { outcome: "failed" | "cancelled" };

/** Sweeps at most this many expired sessions per call (each asks SSLCommerz). */
const EXPIRE_BATCH = 10;

/**
 * Online payment through SSLCommerz (owner, 2026-10-21). The order is created
 * first (stock held, Payment PENDING, tran_id = Payment id), then the customer
 * pays on SSLCommerz's page. Only SSLCommerz's validation API can make the
 * order Paid. Orders not paid within the payment window are cancelled and
 * their stock returned.
 */
@Injectable()
export class SslcommerzService {
  private readonly logger = new Logger(SslcommerzService.name);
  private readonly windowMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: SslcommerzClient,
    private readonly mail: MailService,
    private readonly revalidation: RevalidationService,
    config: ConfigService<Env, true>,
  ) {
    this.windowMs =
      config.get("SSLCOMMERZ_PAYMENT_WINDOW_MINUTES", { infer: true }) * 60_000;
  }

  get configured(): boolean {
    return this.client.configured;
  }

  get sandbox(): boolean {
    return this.client.sandbox;
  }

  /**
   * Opens the payment page for a just-placed order. If SSLCommerz refuses,
   * the order is cancelled at once (stock back) and the customer may retry.
   */
  async startPayment(order: {
    orderNumber: string;
    paymentId: string;
    total: number;
    itemCount: number;
    customerName: string;
    email: string | null;
    phone: string;
    address: string;
    district: string;
  }): Promise<string> {
    try {
      return await this.client.createSession({
        tranId: order.paymentId,
        amount: order.total,
        orderNumber: order.orderNumber,
        itemCount: order.itemCount,
        customer: {
          name: order.customerName,
          email: order.email,
          phone: order.phone,
          address: order.address,
          city: order.district,
        },
      });
    } catch (error) {
      this.logger.error(
        `Could not open payment for ${order.orderNumber}: ${String(error)}`,
      );
      await this.cancelUnpaid(order.paymentId, "Payment page could not open");
      throw new BadGatewayException({
        message:
          "Online payment is not available right now. Please choose another payment method.",
        code: "PAYMENT_GATEWAY_ERROR",
      });
    }
  }

  /**
   * Success return and IPN: ask SSLCommerz about this val_id and record the
   * payment. Safe to call twice (the browser and the IPN both arrive).
   */
  async confirm(valId: string): Promise<PaymentResult> {
    let answer: Record<string, unknown>;
    try {
      answer = await this.client.validate(valId);
    } catch (error) {
      this.logger.error(`SSLCommerz validation call failed: ${String(error)}`);
      return { outcome: "failed" };
    }
    const tranId = typeof answer.tran_id === "string" ? answer.tran_id : "";
    const payment = tranId
      ? await this.prisma.payment.findFirst({
          where: { id: tranId, method: "SSLCOMMERZ" },
          select: {
            id: true,
            amount: true,
            status: true,
            gatewayValId: true,
            orderId: true,
            order: {
              select: {
                orderNumber: true,
                status: true,
                paymentStatus: true,
                email: true,
                customerName: true,
              },
            },
          },
        })
      : null;
    if (!payment) {
      this.logger.warn("SSLCommerz validation for an unknown transaction");
      return { outcome: "failed" };
    }
    const { order } = payment;

    // Already recorded (the other of browser / IPN got here first).
    if (payment.status === "VERIFIED")
      return { outcome: "paid", orderNumber: order.orderNumber };
    if (payment.gatewayValId)
      return { outcome: "review", orderNumber: order.orderNumber };

    const verdict = judgeValidation(answer, {
      tranId: payment.id,
      amount: payment.amount,
    });
    if (verdict.outcome === "invalid") {
      this.logger.warn(
        `SSLCommerz payment for ${order.orderNumber} refused: ${verdict.reason}`,
      );
      return { outcome: "failed" };
    }

    const paid = verdict.outcome === "paid";
    const lateNote =
      order.status === "CANCELLED"
        ? " Paid after the order was cancelled: refund it from the SSLCommerz panel or contact the customer."
        : "";
    const detail = [answer.card_type, answer.bank_tran_id]
      .filter((v) => typeof v === "string" && v)
      .join(" · ");
    const note = paid
      ? `SSLCommerz ${detail}.${lateNote}`.trim()
      : `SSLCommerz flagged this payment as risky (${detail}). Check it in the SSLCommerz panel before verifying.${lateNote}`;
    const next = paid ? "PAID" : "PENDING_VERIFICATION";

    try {
      const recorded = await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.payment.updateMany({
          // REJECTED too: money that arrives after the window closed must
          // still be recorded, so staff can refund it.
          where: {
            id: payment.id,
            status: { in: ["PENDING", "REJECTED"] },
            gatewayValId: null,
          },
          data: {
            gatewayValId: valId,
            note,
            ...(paid && { status: "VERIFIED", verifiedAt: new Date() }),
          },
        });
        if (count === 0) return false;
        await tx.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: next },
        });
        await tx.orderEvent.create({
          data: {
            orderId: payment.orderId,
            type: "PAYMENT",
            from: order.paymentStatus,
            to: next,
            note,
          },
        });
        return true;
      });
      if (!recorded) {
        return {
          outcome: paid ? "paid" : "review",
          orderNumber: order.orderNumber,
        };
      }
    } catch (error) {
      // The same val_id recorded at the same moment by the other request.
      if (!isUniqueViolation(error)) throw error;
    }

    this.logger.log(
      `SSLCommerz payment for ${order.orderNumber}: ${paid ? "paid" : "held for review"}`,
    );
    if (paid && order.email) void this.sendConfirmation(payment.orderId);
    return {
      outcome: paid ? "paid" : "review",
      orderNumber: order.orderNumber,
    };
  }

  /**
   * Fail / cancel return. The browser's word is not trusted either way: we
   * ask SSLCommerz what happened to this transaction, then record a payment
   * it holds or cancel the order.
   */
  async abandon(
    tranId: string,
    kind: "failed" | "cancelled",
  ): Promise<PaymentResult> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: tranId, method: "SSLCOMMERZ" },
      select: { id: true },
    });
    if (!payment) return { outcome: kind };
    let paidValId: string | null;
    try {
      paidValId = paidValIdFrom(await this.client.findByTranId(tranId));
    } catch (error) {
      // Cannot ask now: leave the order; the expiry sweep tries again later.
      this.logger.error(`SSLCommerz lookup failed: ${String(error)}`);
      return { outcome: kind };
    }
    if (paidValId) return this.confirm(paidValId);
    await this.cancelUnpaid(
      tranId,
      kind === "cancelled"
        ? "Customer cancelled the online payment"
        : "Online payment failed",
    );
    return { outcome: kind };
  }

  /**
   * Orders whose payment window passed: record a late payment if SSLCommerz
   * has one, otherwise cancel and return the stock. Called lazily (new
   * orders, the dashboard's order list); never throws.
   */
  async expireStale(): Promise<void> {
    if (!this.configured) return;
    try {
      const stale = await this.prisma.payment.findMany({
        where: {
          method: "SSLCOMMERZ",
          status: "PENDING",
          gatewayValId: null,
          createdAt: { lt: new Date(Date.now() - this.windowMs) },
          order: { status: "PENDING", paymentStatus: "UNPAID" },
        },
        select: { id: true },
        orderBy: { createdAt: "asc" },
        take: EXPIRE_BATCH,
      });
      for (const { id } of stale) await this.abandon(id, "failed");
    } catch (error) {
      this.logger.error(`Expiring online payments failed: ${String(error)}`);
    }
  }

  /**
   * Cancels an order still waiting for its online payment: stock back, coupon
   * use released (the customer never got the order), payment rejected.
   * Conditional, so it never touches an order staff or a payment moved on.
   */
  private async cancelUnpaid(paymentId: string, reason: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        orderId: true,
        order: {
          select: {
            orderNumber: true,
            couponCode: true,
            items: {
              select: {
                variantId: true,
                quantity: true,
                variant: { select: { product: { select: { slug: true } } } },
              },
            },
          },
        },
      },
    });
    if (!payment) return;
    const { order } = payment;
    const cancelled = await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: {
          id: payment.orderId,
          status: "PENDING",
          paymentStatus: "UNPAID",
        },
        data: { status: "CANCELLED" },
      });
      if (count === 0) return false;
      await restoreStock(tx, order.items);
      if (order.couponCode) {
        await tx.coupon.updateMany({
          where: { code: order.couponCode, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
      }
      await tx.payment.updateMany({
        where: { id: paymentId, status: "PENDING" },
        data: { status: "REJECTED", note: reason },
      });
      await tx.orderEvent.create({
        data: {
          orderId: payment.orderId,
          type: "STATUS",
          from: "PENDING",
          to: "CANCELLED",
          note: reason,
        },
      });
      return true;
    });
    if (!cancelled) return;
    this.logger.log(`Order ${order.orderNumber} cancelled: ${reason}`);
    const slugs = new Set(
      order.items
        .map((i) => i.variant?.product.slug)
        .filter((s): s is string => Boolean(s)),
    );
    void this.revalidation.revalidate([
      cacheTags.products,
      ...[...slugs].map(cacheTags.product),
    ]);
  }

  private async sendConfirmation(orderId: string) {
    try {
      const row = await this.prisma.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { ...publicOrderSelect, email: true, customerName: true },
      });
      if (!row.email) return;
      await this.mail.send(
        orderConfirmationMail(toPublicOrder(row), row.customerName, row.email),
        row.orderNumber,
      );
    } catch (error) {
      this.logger.error(`Confirmation email failed: ${String(error)}`);
    }
  }
}
