import type { paymentExportQuerySchema } from "@aaarchive/shared/order";
import { Injectable } from "@nestjs/common";
import type { Response } from "express";
import type { z } from "zod";
import { ExportService } from "../../common/export/export.service.js";
import type { ExportColumn } from "../../common/export/export-columns.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { METHOD_LABEL } from "../orders/orders-export.service.js";
import {
  type AdminPaymentRow,
  adminPaymentSelect,
  paymentWhere,
} from "./payments.service.js";

const STATUS: Record<string, string> = {
  PENDING: "Pending",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

/** Payments export (PRD §6.9). */
const columns: ExportColumn<AdminPaymentRow>[] = [
  {
    header: "Order",
    type: "text",
    width: 12,
    value: (p) => p.order.orderNumber,
  },
  { header: "Date", type: "date", width: 17, value: (p) => p.createdAt },
  {
    header: "Method",
    type: "text",
    width: 8,
    value: (p) => METHOD_LABEL[p.method],
  },
  {
    header: "For",
    type: "text",
    width: 16,
    value: (p) =>
      p.order.paymentMethod === "COD" ? "Delivery advance" : "Full order",
  },
  { header: "Amount", type: "money", width: 10, value: (p) => p.amount },
  {
    header: "Sender number",
    type: "phone",
    width: 13,
    value: (p) => p.senderNumber,
  },
  { header: "TrxID", type: "text", width: 14, value: (p) => p.trxId },
  { header: "Status", type: "text", width: 10, value: (p) => STATUS[p.status] },
  {
    header: "Verified by",
    type: "text",
    width: 16,
    value: (p) => p.verifiedBy?.name,
  },
  {
    header: "Verified at",
    type: "date",
    width: 17,
    value: (p) => p.verifiedAt,
  },
  { header: "Note", type: "text", width: 30, value: (p) => p.note },
];

@Injectable()
export class PaymentsExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exporter: ExportService,
  ) {}

  async export(
    res: Response,
    query: z.output<typeof paymentExportQuerySchema>,
  ) {
    const where = paymentWhere(query);
    await this.exporter.stream(res, {
      resource: "payments",
      format: query.format,
      columns,
      total: await this.prisma.payment.count({ where }),
      rows: this.rows(where),
    });
  }

  private async *rows(where: ReturnType<typeof paymentWhere>) {
    let cursor: string | undefined;
    for (;;) {
      const batch = await this.prisma.payment.findMany({
        where,
        select: adminPaymentSelect,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 500,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      yield* batch;
      if (batch.length < 500) return;
      cursor = batch[batch.length - 1].id;
    }
  }
}
