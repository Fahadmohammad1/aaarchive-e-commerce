import type { SalesReportQuery } from "@aaarchive/shared/report";
import { api } from "@/lib/api/api-client";
import { reportSummarySchema, salesReportSchema } from "./report-schemas";

export function getReportSummary(signal?: AbortSignal) {
  return api.get("/admin/reports/summary", {
    schema: reportSummarySchema,
    signal,
  });
}

export function getSalesReport(query: SalesReportQuery, signal?: AbortSignal) {
  return api.get("/admin/reports/sales", {
    query,
    schema: salesReportSchema,
    signal,
  });
}
