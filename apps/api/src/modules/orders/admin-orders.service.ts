import { cacheTags } from "@aaarchive/shared/cache-tags";
import {
  type adminOrderListQuerySchema,
  canTransition,
  dhakaRange,
  EDITABLE_STATUSES,
  type OrderStatus,
  type orderBulkStatusSchema,
  type orderEditSchema,
  type orderNoteSchema,
  type orderStatusChangeSchema,
  STOCK_RESTORING_STATUSES,
} from "@aaarchive/shared/order";
import { normalizeBdPhone } from "@aaarchive/shared/phone";
import {
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { z } from "zod";
import type { RequestUser } from "../../common/auth/request-user.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { PricingService } from "../cart/pricing.service.js";
import { MailService } from "../mail/mail.service.js";
import { RevalidationService } from "../revalidation/revalidation.service.js";
import { SslcommerzService } from "../sslcommerz/sslcommerz.service.js";
import {
  type AdminOrder,
  adminOrderListSelect,
  adminOrderSelect,
  toAdminOrder,
  toAdminOrderListItem,
} from "./admin-orders.mapper.js";
import { orderStatusMail } from "./order-mail.js";
import { outOfStock } from "./orders.service.js";
import { restoreStock } from "./restore-stock.js";

type ListQuery = z.output<typeof adminOrderListQuerySchema>;
export type OrderFilters = Omit<ListQuery, "page" | "limit">;
type StatusChange = z.output<typeof orderStatusChangeSchema>;
type BulkChange = z.output<typeof orderBulkStatusSchema>;
type NoteInput = z.output<typeof orderNoteSchema>;
type EditInput = z.output<typeof orderEditSchema>;

/** Customers hear about these changes by email, when they gave one (PRD §11). */
const EMAILED: readonly OrderStatus[] = ["CONFIRMED", "SHIPPED", "DELIVERED"];

/** Filters shared by the list and its exports (architecture §4.8). */
export function orderWhere(f: OrderFilters): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {};
  if (f.status) where.status = f.status;
  if (f.paymentStatus) where.paymentStatus = f.paymentStatus;
  if (f.method) where.paymentMethod = f.method;
  if (f.zoneId) where.zoneId = f.zoneId;
  const range = dhakaRange(f.from, f.to);
  if (range.gte || range.lt) where.createdAt = range;
  if (f.q) {
    const q = f.q.trim();
    const digits = normalizeBdPhone(q) ?? q.replace(/\D/g, "");
    where.OR = [
      { orderNumber: { contains: q.toUpperCase().replace(/\s+/g, "") } },
      { customerName: { contains: q, mode: "insensitive" } },
      ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
    ];
  }
  return where;
}

/** Orders in the dashboard (PRD §6.4). OWNER and STAFF. */
@Injectable()
export class AdminOrdersService {
  private readonly logger = new Logger(AdminOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly mail: MailService,
    private readonly revalidation: RevalidationService,
    private readonly sslcommerz: SslcommerzService,
  ) {}

  async list(query: ListQuery) {
    // Staff open this often: a good moment to expire unpaid online orders.
    void this.sslcommerz.expireStale();
    const where = orderWhere(query);
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: adminOrderListSelect,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return {
      data: rows.map(toAdminOrderListItem),
      meta: { page: query.page, limit: query.limit, total },
    };
  }

  async get(id: string): Promise<AdminOrder> {
    const row = await this.prisma.order.findUnique({
      where: { id },
      select: adminOrderSelect,
    });
    if (!row) throw notFound();
    return toAdminOrder(row);
  }

  /**
   * Moves an order along the flow (PRD §6.4). The update only applies if the
   * order is still in the status the change was based on, so two staff
   * members cannot both act on the same order. Cancelled/Returned put stock
   * back; Delivered marks a COD order paid; every change is an OrderEvent.
   */
  async changeStatus(
    id: string,
    input: StatusChange,
    user: RequestUser,
  ): Promise<AdminOrder> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: {
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        orderNumber: true,
        customerName: true,
        email: true,
        items: {
          select: {
            variantId: true,
            quantity: true,
            variant: { select: { product: { select: { slug: true } } } },
          },
        },
      },
    });
    if (!order) throw notFound();
    const from = order.status;
    const to = input.to;
    if (!canTransition(from, to)) {
      throw new ConflictException({
        message: `An order cannot go from ${from} to ${to}`,
        code: "INVALID_TRANSITION",
        details: { from, to },
      });
    }
    const restoring = STOCK_RESTORING_STATUSES.includes(to);
    // Cash collected on delivery settles a COD order (advance or not).
    const paidOnDelivery =
      to === "DELIVERED" &&
      order.paymentMethod === "COD" &&
      (order.paymentStatus === "UNPAID" ||
        order.paymentStatus === "PARTIALLY_PAID");

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id, status: from },
        data: {
          status: to,
          ...(to === "SHIPPED"
            ? {
                courierName: input.courierName,
                trackingNumber: input.trackingNumber,
              }
            : {}),
          ...(paidOnDelivery ? { paymentStatus: "PAID" as const } : {}),
        },
      });
      if (count === 0) throw statusChanged();
      if (restoring) await restoreStock(tx, order.items);
      await tx.orderEvent.create({
        data: {
          orderId: id,
          type: "STATUS",
          from,
          to,
          note: input.note ?? null,
          byUserId: user.id,
        },
      });
      if (paidOnDelivery) {
        await tx.orderEvent.create({
          data: {
            orderId: id,
            type: "PAYMENT",
            from: order.paymentStatus,
            to: "PAID",
            byUserId: user.id,
          },
        });
      }
    });

    this.logger.log(`Order ${order.orderNumber}: ${from} → ${to}`);
    if (restoring) {
      void this.revalidateProducts(
        order.items.map((i) => i.variant?.product.slug),
      );
    }
    if (order.email && EMAILED.includes(to)) {
      void this.mail.send(
        orderStatusMail({
          orderNumber: order.orderNumber,
          name: order.customerName,
          to: order.email,
          status: to,
          courierName: input.courierName ?? null,
          trackingNumber: input.trackingNumber ?? null,
        }),
        order.orderNumber,
      );
    }
    return this.get(id);
  }

  /** Same rules as one by one; each order succeeds or fails on its own. */
  async bulkStatus(input: BulkChange, user: RequestUser) {
    const results: Array<{ id: string; ok: boolean; code?: string }> = [];
    for (const id of input.ids) {
      try {
        await this.changeStatus(id, { to: input.to, note: input.note }, user);
        results.push({ id, ok: true });
      } catch (error) {
        const code =
          error instanceof HttpException
            ? ((error.getResponse() as { code?: string }).code ?? "ERROR")
            : "ERROR";
        if (!(error instanceof HttpException)) {
          this.logger.error(`Bulk status failed for ${id}: ${String(error)}`);
        }
        results.push({ id, ok: false, code });
      }
    }
    return { results };
  }

  /** Internal note, or a call attempt with its outcome (PRD §6.4). */
  async addNote(
    id: string,
    input: NoteInput,
    user: RequestUser,
  ): Promise<AdminOrder> {
    const exists = await this.prisma.order.count({ where: { id } });
    if (!exists) throw notFound();
    await this.prisma.orderEvent.create({
      data: {
        orderId: id,
        type: input.type,
        // A call keeps its outcome code in `to`, like a status change.
        to: input.type === "CALL" ? input.outcome : null,
        note: input.note ?? null,
        byUserId: user.id,
      },
    });
    return this.get(id);
  }

  /**
   * Edit before shipping (PRD §6.4): lines, address and delivery charge.
   * Kept lines keep the price they were sold at; new lines are priced from
   * the database now. Stock moves by the difference only, inside the same
   * transaction (conditional decrement for increases).
   */
  async edit(
    id: string,
    input: EditInput,
    user: RequestUser,
  ): Promise<AdminOrder> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: {
        status: true,
        zoneId: true,
        discount: true,
        deliveryCharge: true,
        subtotal: true,
        items: {
          select: {
            id: true,
            variantId: true,
            quantity: true,
            unitPrice: true,
            variant: { select: { product: { select: { slug: true } } } },
          },
        },
      },
    });
    if (!order) throw notFound();
    if (!EDITABLE_STATUSES.includes(order.status)) {
      throw new ConflictException({
        message: "Orders can only be edited before they ship",
        code: "ORDER_NOT_EDITABLE",
      });
    }

    let zoneCharge: number | null = null;
    if (input.zoneId && input.zoneId !== order.zoneId) {
      const zone = await this.prisma.deliveryZone.findUnique({
        where: { id: input.zoneId },
        select: { charge: true },
      });
      if (!zone) {
        throw new UnprocessableEntityException({
          message: "Please choose a delivery zone",
          code: "ZONE_UNAVAILABLE",
        });
      }
      zoneCharge = zone.charge;
    }

    const old = new Map(
      order.items
        .filter((i) => i.variantId)
        .map((i) => [i.variantId as string, i]),
    );
    const added = (input.items ?? []).filter((i) => !old.has(i.variantId));
    const priced = added.length > 0 ? await this.pricing.price(added) : null;
    if (priced && priced.unavailable.length > 0) {
      throw new UnprocessableEntityException({
        message: "Some items are not available",
        code: "ITEM_UNAVAILABLE",
        details: { variantIds: priced.unavailable },
      });
    }

    const changed = Object.keys(input);
    const touchedSlugs: Array<string | undefined> = [];

    await this.prisma.$transaction(async (tx) => {
      let subtotal = order.subtotal;
      if (input.items) {
        const next = new Map(input.items.map((i) => [i.variantId, i.quantity]));
        // Stock moves by the difference, in variant-id order (no deadlocks).
        const ids = [...new Set([...old.keys(), ...next.keys()])].sort();
        for (const variantId of ids) {
          const delta =
            (next.get(variantId) ?? 0) - (old.get(variantId)?.quantity ?? 0);
          if (delta > 0) {
            const { count } = await tx.variant.updateMany({
              where: { id: variantId, stock: { gte: delta } },
              data: { stock: { decrement: delta } },
            });
            if (count === 0) throw outOfStock([variantId]);
          } else if (delta < 0) {
            await tx.variant.updateMany({
              where: { id: variantId },
              data: { stock: { increment: -delta } },
            });
          }
        }
        for (const line of order.items) {
          const qty = line.variantId ? next.get(line.variantId) : undefined;
          if (qty === undefined) {
            await tx.orderItem.delete({ where: { id: line.id } });
          } else if (qty !== line.quantity) {
            await tx.orderItem.update({
              where: { id: line.id },
              data: { quantity: qty, lineTotal: qty * line.unitPrice },
            });
          }
          touchedSlugs.push(line.variant?.product.slug);
        }
        for (const line of priced?.lines ?? []) {
          await tx.orderItem.create({
            data: {
              orderId: id,
              variantId: line.variantId,
              productName: line.productName,
              sizeName: line.sizeName,
              colorName: line.colorName,
              sku: line.sku,
              unitPrice: line.unitPrice,
              quantity: line.quantity,
              lineTotal: line.lineTotal,
            },
          });
          touchedSlugs.push(line.productSlug);
        }
        const totals = await tx.orderItem.aggregate({
          where: { orderId: id },
          _sum: { lineTotal: true },
        });
        subtotal = totals._sum.lineTotal ?? 0;
      }
      // The coupon's amount stays, but never more than the goods.
      const discount = Math.min(order.discount, subtotal);
      const deliveryCharge =
        input.deliveryCharge ?? zoneCharge ?? order.deliveryCharge;
      const { count } = await tx.order.updateMany({
        where: { id, status: order.status },
        data: {
          ...(input.customerName !== undefined
            ? { customerName: input.customerName }
            : {}),
          ...(input.altPhone !== undefined ? { altPhone: input.altPhone } : {}),
          ...(input.zoneId !== undefined ? { zoneId: input.zoneId } : {}),
          ...(input.district !== undefined ? { district: input.district } : {}),
          ...(input.area !== undefined ? { area: input.area } : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
          subtotal,
          discount,
          deliveryCharge,
          total: subtotal - discount + deliveryCharge,
        },
      });
      if (count === 0) throw statusChanged();
      await tx.orderEvent.create({
        data: {
          orderId: id,
          type: "EDIT",
          // Which parts changed, as field names (shown translated).
          to: changed.join(","),
          byUserId: user.id,
        },
      });
    });

    if (input.items) void this.revalidateProducts(touchedSlugs);
    return this.get(id);
  }

  /** Stock status on product pages and listings follows the restored stock. */
  private async revalidateProducts(slugs: Array<string | undefined>) {
    const unique = [...new Set(slugs.filter((s): s is string => Boolean(s)))];
    if (unique.length === 0) return;
    await this.revalidation.revalidate([
      cacheTags.products,
      ...unique.map(cacheTags.product),
    ]);
  }
}

function notFound() {
  return new NotFoundException({
    message: "Order not found",
    code: "NOT_FOUND",
  });
}

function statusChanged() {
  return new ConflictException({
    message: "This order was changed by someone else. Reload and try again.",
    code: "STATUS_CHANGED",
  });
}
