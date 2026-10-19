"use client";

import type {
  AdminOrderListQuery,
  OrderBulkStatus,
  OrderEditInput,
  OrderNoteInput,
  OrderStatusChange,
} from "@aaarchive/shared/order";
import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { reportKeys } from "@/lib/report/report-keys";
import {
  addOrderNote,
  bulkOrderStatus,
  changeOrderStatus,
  editOrder,
  getOrder,
  listOrders,
} from "./order-api";
import { orderKeys } from "./order-keys";
import type { AdminOrder } from "./order-schemas";

export function useOrders(query: AdminOrderListQuery) {
  return useQuery({
    queryKey: orderKeys.list(query),
    queryFn: ({ signal }) => listOrders(query, signal),
    placeholderData: keepPreviousData,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: ({ signal }) => getOrder(id, signal),
  });
}

/** Several orders at once (print page). */
export function useOrdersByIds(ids: string[]) {
  return useQueries({
    queries: ids.map((id) => ({
      queryKey: orderKeys.detail(id),
      queryFn: ({ signal }: { signal: AbortSignal }) => getOrder(id, signal),
    })),
  });
}

/** Every order change returns the fresh order: store it, refresh lists and stats. */
function useOrderMutation<V>(fn: (vars: V) => Promise<AdminOrder>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      void queryClient.invalidateQueries({
        queryKey: [...orderKeys.all, "list"],
      });
      void queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}

export function useChangeOrderStatus(id: string) {
  return useOrderMutation((body: OrderStatusChange) =>
    changeOrderStatus(id, body),
  );
}

export function useAddOrderNote(id: string) {
  return useOrderMutation((body: OrderNoteInput) => addOrderNote(id, body));
}

export function useEditOrder(id: string) {
  return useOrderMutation((body: OrderEditInput) => editOrder(id, body));
}

export function useBulkOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: OrderBulkStatus) => bulkOrderStatus(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: orderKeys.all });
      void queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}
