"use client";

import { useQuery } from "@tanstack/react-query";
import { getReportSummary } from "./report-api";
import { reportKeys } from "./report-keys";

/** Dashboard numbers; refreshed every minute while the page is open. */
export function useReportSummary() {
  return useQuery({
    queryKey: reportKeys.summary(),
    queryFn: ({ signal }) => getReportSummary(signal),
    refetchInterval: 60_000,
  });
}
