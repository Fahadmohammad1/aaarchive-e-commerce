import {
  type SalesReportQuery,
  salesReportQuerySchema,
} from "@aaarchive/shared/report";
import { Controller, Get, Header, Query } from "@nestjs/common";
import { Roles } from "../../common/auth/auth.decorators.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { ReportsService } from "./reports.service.js";
import { SalesReportService } from "./sales-report.service.js";

/** Dashboard home numbers (PRD §6.1, OWNER and STAFF) and sales analytics. */
@Controller("admin/reports")
export class AdminReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly salesReport: SalesReportService,
  ) {}

  @Get("summary")
  @Header("Cache-Control", "no-store")
  summary() {
    return this.reports.summary();
  }

  /** Sales analytics for a Dhaka date range. Owner only. */
  @Get("sales")
  @Roles("OWNER")
  @Header("Cache-Control", "no-store")
  sales(
    @Query(new ZodValidationPipe(salesReportQuerySchema))
    query: SalesReportQuery,
  ) {
    return this.salesReport.sales(query);
  }
}
