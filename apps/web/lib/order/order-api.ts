import type { ExportFormat } from "@aaarchive/shared/export";
import type {
  AdminOrderListQuery,
  OrderBulkStatus,
  OrderEditInput,
  OrderNoteInput,
  OrderStatusChange,
} from "@aaarchive/shared/order";
import { api } from "@/lib/api/api-client";
import {
  adminOrderSchema,
  bulkResultSchema,
  orderPageSchema,
} from "./order-schemas";

// Dashboard order calls (PRD §6.4). The storefront's are in order-store-api.ts.

const path = (id: string) => `/admin/orders/${encodeURIComponent(id)}`;

export function listOrders(query: AdminOrderListQuery, signal?: AbortSignal) {
  return api.get("/admin/orders", { query, schema: orderPageSchema, signal });
}

export function getOrder(id: string, signal?: AbortSignal) {
  return api.get(path(id), { schema: adminOrderSchema, signal });
}

export function changeOrderStatus(id: string, body: OrderStatusChange) {
  return api.patch(`${path(id)}/status`, { body, schema: adminOrderSchema });
}

export function bulkOrderStatus(body: OrderBulkStatus) {
  return api.post("/admin/orders/bulk-status", {
    body,
    schema: bulkResultSchema,
    timeoutMs: 60_000,
  });
}

export function addOrderNote(id: string, body: OrderNoteInput) {
  return api.post(`${path(id)}/notes`, { body, schema: adminOrderSchema });
}

export function editOrder(id: string, body: OrderEditInput) {
  return api.patch(path(id), { body, schema: adminOrderSchema });
}

type Filters = Omit<AdminOrderListQuery, "page" | "limit">;

export function exportOrders(query: Filters, format: ExportFormat) {
  return api.download("/admin/orders/export", {
    query: { ...query, format },
    timeoutMs: 120_000,
  });
}

export function exportOrderItems(query: Filters, format: ExportFormat) {
  return api.download("/admin/orders/items/export", {
    query: { ...query, format },
    timeoutMs: 120_000,
  });
}
