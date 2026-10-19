import type { couponExportQuerySchema } from "@aaarchive/shared/coupon";
import { Injectable } from "@nestjs/common";
import type { Response } from "express";
import type { z } from "zod";
import { ExportService } from "../../common/export/export.service.js";
import type { ExportColumn } from "../../common/export/export-columns.js";
import type { Coupon } from "../../generated/prisma/client.js";
import { CouponsService } from "./coupons.service.js";

const SCOPE: Record<Coupon["scope"], string> = {
  ALL: "All products",
  CATEGORY: "Categories",
  PRODUCT: "Products",
};

/** Coupons export (PRD §6.9): code, type, value, limits, dates, usage, active. */
const columns: ExportColumn<Coupon>[] = [
  { header: "Code", type: "text", width: 16, value: (c) => c.code },
  {
    header: "Type",
    type: "text",
    width: 10,
    value: (c) => (c.type === "PERCENT" ? "Percent" : "Fixed"),
  },
  // Percent stays a plain number; fixed amounts are money.
  {
    header: "Value",
    type: "number",
    width: 8,
    value: (c) => c.value,
  },
  {
    header: "Minimum order",
    type: "money",
    width: 12,
    value: (c) => c.minOrder,
  },
  {
    header: "Maximum discount",
    type: "money",
    width: 12,
    value: (c) => c.maxDiscount,
  },
  { header: "Starts", type: "date", width: 17, value: (c) => c.startsAt },
  { header: "Ends", type: "date", width: 17, value: (c) => c.endsAt },
  {
    header: "Usage limit",
    type: "number",
    width: 10,
    value: (c) => c.usageLimit,
  },
  {
    header: "Per-phone limit",
    type: "number",
    width: 10,
    value: (c) => c.perPhoneLimit,
  },
  {
    header: "Applies to",
    type: "text",
    width: 14,
    value: (c) => SCOPE[c.scope],
  },
  { header: "Used", type: "number", width: 8, value: (c) => c.usedCount },
  {
    header: "Active",
    type: "text",
    width: 8,
    value: (c) => (c.isActive ? "Yes" : "No"),
  },
];

@Injectable()
export class CouponsExportService {
  constructor(
    private readonly coupons: CouponsService,
    private readonly exporter: ExportService,
  ) {}

  async export(res: Response, query: z.output<typeof couponExportQuerySchema>) {
    await this.exporter.stream(res, {
      resource: "coupons",
      format: query.format,
      columns,
      total: await this.coupons.countForExport(query),
      rows: this.coupons.exportRows(query),
    });
  }
}
