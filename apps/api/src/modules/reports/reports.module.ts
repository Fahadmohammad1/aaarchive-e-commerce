import { Module } from "@nestjs/common";
import { AdminReportsController } from "./admin-reports.controller.js";
import { ReportsService } from "./reports.service.js";
import { SalesReportService } from "./sales-report.service.js";

@Module({
  controllers: [AdminReportsController],
  providers: [ReportsService, SalesReportService],
})
export class ReportsModule {}
