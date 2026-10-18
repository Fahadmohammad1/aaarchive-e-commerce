import type {
  CatalogListQuery,
  SizeChartInput,
} from "@aaarchive/shared/catalog";
import { api } from "@/lib/api/api-client";
import {
  adminSizeChartSchema,
  sizeChartPageSchema,
} from "./size-chart-schemas";

export function listSizeCharts(query: CatalogListQuery, signal?: AbortSignal) {
  return api.get("/admin/size-charts", {
    query,
    schema: sizeChartPageSchema,
    signal,
  });
}

export function createSizeChart(body: SizeChartInput) {
  return api.post("/admin/size-charts", { body, schema: adminSizeChartSchema });
}

/** The API takes the whole chart on update (columns and rows go together). */
export function updateSizeChart(id: string, body: SizeChartInput) {
  return api.patch(`/admin/size-charts/${encodeURIComponent(id)}`, {
    body,
    schema: adminSizeChartSchema,
  });
}

export function deleteSizeChart(id: string): Promise<void> {
  return api.delete(`/admin/size-charts/${encodeURIComponent(id)}`);
}
