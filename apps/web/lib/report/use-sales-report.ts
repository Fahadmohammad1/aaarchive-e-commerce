"use client";

import type { SalesReportQuery } from "@aaarchive/shared/report";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getSalesReport } from "./report-api";
import { reportKeys } from "./report-keys";

/** Sales analytics for a date range; keeps the last range on screen while the next loads. */
export function useSalesReport(query: SalesReportQuery, enabled = true) {
  return useQuery({
    queryKey: reportKeys.sales(query),
    queryFn: ({ signal }) => getSalesReport(query, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}
