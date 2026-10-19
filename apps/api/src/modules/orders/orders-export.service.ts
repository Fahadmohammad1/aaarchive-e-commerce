import type { orderExportQuerySchema } from "@aaarchive/shared/order";
import { Injectable } from "@nestjs/common";
import type { Response } from "express";
import type { z } from "zod";
import { ExportService } from "../../common/export/export.service.js";
import type { ExportColumn } from "../../common/export/export-columns.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { orderWhere } from "./admin-orders.service.js";

type ExportQuery = z.output<typeof orderExportQuerySchema>;

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
};
export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "Unpaid",
  PENDING_VERIFICATION: "Pending verification",
  PAID: "Paid",
  REFUNDED: "Refunded",
  PARTIALLY_PAID: "Partially paid",
};
export const METHOD_LABEL: Record<string, string> = {
  COD: "Cash on Delivery",
  BKASH: "bKash",
  NAGAD: "Nagad",
};

const orderInclude = {
  zone: { select: { name: true } },
  items: {
    select: {
      productName: true,
      sizeName: true,
      colorName: true,
      quantity: true,
    },
    orderBy: { createdAt: "asc" },
  },
} as const satisfies Prisma.OrderInclude;
type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

/** Orders export, one row per order (PRD §6.9). */
const orderColumns: ExportColumn<OrderRow>[] = [
  { header: "Order", type: "text", width: 12, value: (o) => o.orderNumber },
  { header: "Date", type: "date", width: 17, value: (o) => o.createdAt },
  {
    header: "Status",
    type: "text",
    width: 11,
    value: (o) => STATUS_LABEL[o.status],
  },
  {
    header: "Payment method",
    type: "text",
    width: 16,
    value: (o) => METHOD_LABEL[o.paymentMethod],
  },
  {
    header: "Payment status",
    type: "text",
    width: 18,
    value: (o) => PAYMENT_STATUS_LABEL[o.paymentStatus],
  },
  { header: "Customer", type: "text", width: 20, value: (o) => o.customerName },
  { header: "Phone", type: "phone", width: 13, value: (o) => o.phone },
  { header: "Zone", type: "text", width: 14, value: (o) => o.zone.name },
  { header: "District", type: "text", width: 13, value: (o) => o.district },
  { header: "Area", type: "text", width: 16, value: (o) => o.area },
  { header: "Address", type: "text", width: 30, value: (o) => o.address },
  {
    header: "Items",
    type: "text",
    width: 40,
    value: (o) =>
      o.items
        .map(
          (i) =>
            `${i.productName} (${i.sizeName}, ${i.colorName}) × ${i.quantity}`,
        )
        .join("; "),
  },
  { header: "Subtotal", type: "money", width: 10, value: (o) => o.subtotal },
  { header: "Discount", type: "money", width: 10, value: (o) => o.discount },
  {
    header: "Delivery charge",
    type: "money",
    width: 10,
    value: (o) => o.deliveryCharge,
  },
  { header: "Total", type: "money", width: 10, value: (o) => o.total },
  { header: "Coupon", type: "text", width: 12, value: (o) => o.couponCode },
  { header: "Courier", type: "text", width: 14, value: (o) => o.courierName },
  {
    header: "Tracking number",
    type: "text",
    width: 18,
    value: (o) => o.trackingNumber,
  },
];

const itemInclude = {
  order: { select: { orderNumber: true, createdAt: true, status: true } },
} as const satisfies Prisma.OrderItemInclude;
type ItemRow = Prisma.OrderItemGetPayload<{ include: typeof itemInclude }>;

/** Order items export, one row per line, for packing and sales (PRD §6.9). */
const itemColumns: ExportColumn<ItemRow>[] = [
  {
    header: "Order",
    type: "text",
    width: 12,
    value: (i) => i.order.orderNumber,
  },
  { header: "Date", type: "date", width: 17, value: (i) => i.order.createdAt },
  {
    header: "Status",
    type: "text",
    width: 11,
    value: (i) => STATUS_LABEL[i.order.status],
  },
  { header: "Product", type: "text", width: 30, value: (i) => i.productName },
  { header: "SKU", type: "text", width: 24, value: (i) => i.sku },
  { header: "Size", type: "text", width: 8, value: (i) => i.sizeName },
  { header: "Colour", type: "text", width: 12, value: (i) => i.colorName },
  { header: "Unit price", type: "money", width: 10, value: (i) => i.unitPrice },
  { header: "Quantity", type: "number", width: 8, value: (i) => i.quantity },
  { header: "Line total", type: "money", width: 10, value: (i) => i.lineTotal },
];

const BATCH = 500;

@Injectable()
export class OrdersExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exporter: ExportService,
  ) {}

  async exportOrders(res: Response, query: ExportQuery) {
    const where = orderWhere(query);
    await this.exporter.stream(res, {
      resource: "orders",
      format: query.format,
      columns: orderColumns,
      total: await this.prisma.order.count({ where }),
      rows: this.orderRows(where),
    });
  }

  async exportItems(res: Response, query: ExportQuery) {
    const where = { order: orderWhere(query) };
    await this.exporter.stream(res, {
      resource: "order-items",
      format: query.format,
      columns: itemColumns,
      total: await this.prisma.orderItem.count({ where }),
      rows: this.itemRows(where),
    });
  }

  /** Newest first, like the list; keyset paging on (createdAt, id). */
  private async *orderRows(where: Prisma.OrderWhereInput) {
    let cursor: string | undefined;
    for (;;) {
      const batch = await this.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: BATCH,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      yield* batch;
      if (batch.length < BATCH) return;
      cursor = batch[batch.length - 1].id;
    }
  }

  private async *itemRows(where: Prisma.OrderItemWhereInput) {
    let cursor: string | undefined;
    for (;;) {
      const batch = await this.prisma.orderItem.findMany({
        where,
        include: itemInclude,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: BATCH,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      yield* batch;
      if (batch.length < BATCH) return;
      cursor = batch[batch.length - 1].id;
    }
  }
}
