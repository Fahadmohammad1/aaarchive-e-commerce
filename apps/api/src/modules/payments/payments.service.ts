import {
  dhakaRange,
  type paymentListQuerySchema,
} from "@aaarchive/shared/order";
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { z } from "zod";
import type { RequestUser } from "../../common/auth/request-user.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";

type ListQuery = z.output<typeof paymentListQuerySchema>;
export type PaymentFilters = Omit<ListQuery, "page" | "limit">;

export const adminPaymentSelect = {
  id: true,
  method: true,
  amount: true,
  senderNumber: true,
  trxId: true,
  status: true,
  note: true,
  verifiedAt: true,
  createdAt: true,
  verifiedBy: { select: { name: true } },
  order: {
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      phone: true,
      paymentMethod: true,
      status: true,
      total: true,
    },
  },
} as const satisfies Prisma.PaymentSelect;
export type AdminPaymentRow = Prisma.PaymentGetPayload<{
  select: typeof adminPaymentSelect;
}>;

function toAdminPayment(p: AdminPaymentRow) {
  return {
    id: p.id,
    method: p.method,
    amount: p.amount,
    senderNumber: p.senderNumber,
    trxId: p.trxId,
    status: p.status,
    note: p.note,
    verifiedAt: p.verifiedAt?.toISOString() ?? null,
    verifiedBy: p.verifiedBy?.name ?? null,
    createdAt: p.createdAt.toISOString(),
    order: {
      id: p.order.id,
      orderNumber: p.order.orderNumber,
      customerName: p.order.customerName,
      phone: p.order.phone,
      paymentMethod: p.order.paymentMethod,
      status: p.order.status,
      total: p.order.total,
    },
    /** A COD order's advance (the delivery charge), not the full amount. */
    isAdvance: p.order.paymentMethod === "COD",
  };
}

/**
 * Filters shared by the list and its export: bKash/Nagad records, and
 * SSLCommerz payments once SSLCommerz has confirmed one (a session still
 * waiting, or abandoned, has nothing for staff to check).
 */
export function paymentWhere(f: PaymentFilters): Prisma.PaymentWhereInput {
  const where: Prisma.PaymentWhereInput = {
    NOT: { method: "SSLCOMMERZ", gatewayValId: null },
  };
  if (f.status) where.status = f.status;
  if (f.method) where.method = f.method;
  const range = dhakaRange(f.from, f.to);
  if (range.gte || range.lt) where.createdAt = range;
  if (f.q) {
    const q = f.q.trim();
    where.OR = [
      { trxId: { contains: q.toUpperCase() } },
      { senderNumber: { contains: q.replace(/\D/g, "") || q } },
      { order: { orderNumber: { contains: q.toUpperCase() } } },
    ];
  }
  return where;
}

/** Manual bKash/Nagad checks (PRD §6.4). OWNER and STAFF. */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListQuery) {
    const where = paymentWhere(query);
    const [rows, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        select: adminPaymentSelect,
        // Oldest pending first is what staff work through; others newest first.
        orderBy:
          query.status === "PENDING"
            ? { createdAt: "asc" }
            : { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return {
      data: rows.map(toAdminPayment),
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  /**
   * Verified → the order is Paid (full bKash/Nagad payment) or Partially paid
   * (COD advance; Paid if it was already delivered). Rejected → Unpaid.
   * Only a pending payment can be decided, once.
   */
  async decide(
    id: string,
    decision: "VERIFIED" | "REJECTED",
    note: string | undefined,
    user: RequestUser,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      select: {
        status: true,
        method: true,
        gatewayValId: true,
        orderId: true,
        order: {
          select: {
            orderNumber: true,
            paymentMethod: true,
            paymentStatus: true,
            status: true,
          },
        },
      },
    });
    if (!payment) {
      throw new NotFoundException({
        message: "Payment not found",
        code: "NOT_FOUND",
      });
    }
    // An online payment is decided by SSLCommerz; staff only settle the ones
    // it flagged as risky (confirmed, held for review).
    if (payment.method === "SSLCOMMERZ" && !payment.gatewayValId) {
      throw new ConflictException({
        message: "This online payment has not been received",
        code: "PAYMENT_NOT_RECEIVED",
      });
    }
    const order = payment.order;
    const next =
      decision === "REJECTED"
        ? "UNPAID"
        : order.paymentMethod !== "COD" || order.status === "DELIVERED"
          ? "PAID"
          : "PARTIALLY_PAID";

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.payment.updateMany({
        where: { id, status: "PENDING" },
        data: {
          status: decision,
          note: note ?? null,
          verifiedById: user.id,
          verifiedAt: new Date(),
        },
      });
      if (count === 0) {
        throw new ConflictException({
          message: "This payment was already checked",
          code: "PAYMENT_ALREADY_DECIDED",
        });
      }
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
          note: note ?? null,
          byUserId: user.id,
        },
      });
    });
    this.logger.log(`Payment for ${order.orderNumber}: ${decision}`);
    const row = await this.prisma.payment.findUniqueOrThrow({
      where: { id },
      select: adminPaymentSelect,
    });
    return toAdminPayment(row);
  }
}
