import type { customerExportQuerySchema } from "@aaarchive/shared/customer";
import { successRate } from "@aaarchive/shared/customer";
import { Injectable } from "@nestjs/common";
import type { Response } from "express";
import type { z } from "zod";
import { ExportService } from "../../common/export/export.service.js";
import type { ExportColumn } from "../../common/export/export-columns.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import {
  type CustomerFilters,
  type CustomerRow,
  customerCountSql,
  customersSql,
} from "./customers.query.js";

/** Customers export, one row per phone (PRD §6.9). */
const columns: ExportColumn<CustomerRow>[] = [
  { header: "Name", type: "text", width: 22, value: (c) => c.name },
  { header: "Phone", type: "phone", width: 13, value: (c) => c.phone },
  { header: "Email", type: "text", width: 24, value: (c) => c.email },
  { header: "Orders", type: "number", width: 8, value: (c) => c.orders },
  { header: "Delivered", type: "number", width: 9, value: (c) => c.delivered },
  {
    header: "Cancelled / returned",
    type: "number",
    width: 10,
    value: (c) => c.failed,
  },
  {
    header: "Success rate %",
    type: "number",
    width: 9,
    value: (c) => successRate(c.delivered, c.failed),
  },
  { header: "Total spent", type: "money", width: 11, value: (c) => c.spent },
  {
    header: "Last order",
    type: "date",
    width: 17,
    value: (c) => c.lastOrderAt,
  },
  {
    header: "Blocked",
    type: "text",
    width: 8,
    value: (c) => (c.blocked ? "Yes" : "No"),
  },
];

const BATCH = 1000;

@Injectable()
export class CustomersExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exporter: ExportService,
  ) {}

  async export(
    res: Response,
    query: z.output<typeof customerExportQuerySchema>,
  ) {
    const [count] = await this.prisma.$queryRaw<{ n: number }[]>(
      customerCountSql(query),
    );
    await this.exporter.stream(res, {
      resource: "customers",
      format: query.format,
      columns,
      total: count?.n ?? 0,
      rows: this.rows(query),
    });
  }

  private async *rows(filters: CustomerFilters) {
    for (let offset = 0; ; offset += BATCH) {
      const batch = await this.prisma.$queryRaw<CustomerRow[]>(
        customersSql(filters, { limit: BATCH, offset }),
      );
      yield* batch;
      if (batch.length < BATCH) return;
    }
  }
}
