import { Controller, Get, Header } from "@nestjs/common";
import { ReportsService } from "./reports.service.js";

/** Dashboard home numbers (PRD §6.1). OWNER and STAFF. */
@Controller("admin/reports")
export class AdminReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("summary")
  @Header("Cache-Control", "no-store")
  summary() {
    return this.reports.summary();
  }
}
