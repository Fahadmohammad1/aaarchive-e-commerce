"use client";

import type {
  CatalogListQuery,
  SizeChartInput,
} from "@aaarchive/shared/catalog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSizeChart,
  deleteSizeChart,
  listSizeCharts,
  updateSizeChart,
} from "./size-chart-api";
import { sizeChartKeys } from "./size-chart-keys";

export function useSizeCharts(query: CatalogListQuery = {}) {
  return useQuery({
    queryKey: sizeChartKeys.list(query),
    queryFn: ({ signal }) => listSizeCharts(query, signal),
  });
}

/** Create (no id) or update (id). */
export function useSaveSizeChart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: SizeChartInput }) =>
      id ? updateSizeChart(id, body) : createSizeChart(body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: sizeChartKeys.all }),
  });
}

export function useDeleteSizeChart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSizeChart,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: sizeChartKeys.all }),
  });
}
