"use client";

import type { PaymentListQuery } from "@aaarchive/shared/order";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { orderKeys } from "@/lib/order/order-keys";
import { reportKeys } from "@/lib/report/report-keys";
import { listPayments, rejectPayment, verifyPayment } from "./payment-api";
import { paymentKeys } from "./payment-keys";

export function usePayments(query: PaymentListQuery) {
  return useQuery({
    queryKey: paymentKeys.list(query),
    queryFn: ({ signal }) => listPayments(query, signal),
    placeholderData: keepPreviousData,
  });
}

/** Verify or reject; the order's payment status changes too. */
export function useDecidePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      note,
    }: {
      id: string;
      decision: "verify" | "reject";
      note?: string;
    }) =>
      decision === "verify"
        ? verifyPayment(id, note)
        : rejectPayment(id, note ?? ""),
    onSuccess: (payment) => {
      void queryClient.invalidateQueries({ queryKey: paymentKeys.all });
      void queryClient.invalidateQueries({
        queryKey: orderKeys.detail(payment.order.id),
      });
      void queryClient.invalidateQueries({
        queryKey: [...orderKeys.all, "list"],
      });
      void queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}
