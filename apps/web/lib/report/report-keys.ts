import type { SalesReportQuery } from "@aaarchive/shared/report";

export const reportKeys = {
  all: ["reports"] as const,
  summary: () => [...reportKeys.all, "summary"] as const,
  sales: (query: SalesReportQuery) =>
    [...reportKeys.all, "sales", query] as const,
};
