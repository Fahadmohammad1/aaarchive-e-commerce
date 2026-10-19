import { api } from "@/lib/api/api-client";
import { reportSummarySchema } from "./report-schemas";

export function getReportSummary(signal?: AbortSignal) {
  return api.get("/admin/reports/summary", {
    schema: reportSummarySchema,
    signal,
  });
}
