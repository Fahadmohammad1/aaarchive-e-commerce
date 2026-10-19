import { EDITABLE_STATUSES, ORDER_TRANSITIONS } from "@aaarchive/shared/order";
import type { Prisma } from "../../generated/prisma/client.js";

// ADMIN order shapes (PRD §6.4). Staff see the full phone and address; still
// picked field by field so new columns never leak by default.

export const adminOrderListSelect = {
  id: true,
  orderNumber: true,
  createdAt: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  customerName: true,
  phone: true,
  district: true,
  total: true,
  zone: { select: { name: true } },
  _count: { select: { items: true } },
} as const satisfies Prisma.OrderSelect;

type ListRow = Prisma.OrderGetPayload<{ select: typeof adminOrderListSelect }>;

export function toAdminOrderListItem(row: ListRow) {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    paymentStatus: row.paymentStatus,
    paymentMethod: row.paymentMethod,
    customerName: row.customerName,
    phone: row.phone,
    district: row.district,
    zoneName: row.zone.name,
    total: row.total,
    itemCount: row._count.items,
  };
}
export type AdminOrderListItem = ReturnType<typeof toAdminOrderListItem>;

export const adminOrderSelect = {
  ...adminOrderListSelect,
  updatedAt: true,
  altPhone: true,
  email: true,
  zoneId: true,
  area: true,
  address: true,
  note: true,
  subtotal: true,
  discount: true,
  deliveryCharge: true,
  couponCode: true,
  courierName: true,
  trackingNumber: true,
  zone: { select: { id: true, name: true, charge: true } },
  items: {
    select: {
      id: true,
      variantId: true,
      productName: true,
      sizeName: true,
      colorName: true,
      sku: true,
      unitPrice: true,
      quantity: true,
      lineTotal: true,
    },
    orderBy: { createdAt: "asc" },
  },
  payments: {
    select: {
      id: true,
      method: true,
      amount: true,
      senderNumber: true,
      trxId: true,
      status: true,
      note: true,
      verifiedAt: true,
      verifiedBy: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  },
  events: {
    select: {
      id: true,
      type: true,
      from: true,
      to: true,
      note: true,
      createdAt: true,
      byUser: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  },
} as const satisfies Prisma.OrderSelect;

export type AdminOrderRow = Prisma.OrderGetPayload<{
  select: typeof adminOrderSelect;
}>;

export function toAdminOrder(row: AdminOrderRow) {
  return {
    ...toAdminOrderListItem({ ...row, zone: { name: row.zone.name } }),
    updatedAt: row.updatedAt.toISOString(),
    altPhone: row.altPhone,
    email: row.email,
    zone: { id: row.zone.id, name: row.zone.name, charge: row.zone.charge },
    area: row.area,
    address: row.address,
    note: row.note,
    subtotal: row.subtotal,
    discount: row.discount,
    deliveryCharge: row.deliveryCharge,
    couponCode: row.couponCode,
    courierName: row.courierName,
    trackingNumber: row.trackingNumber,
    items: row.items.map((i) => ({
      id: i.id,
      variantId: i.variantId,
      productName: i.productName,
      sizeName: i.sizeName,
      colorName: i.colorName,
      sku: i.sku,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
    })),
    payments: row.payments.map((p) => ({
      id: p.id,
      method: p.method,
      amount: p.amount,
      senderNumber: p.senderNumber,
      trxId: p.trxId,
      status: p.status,
      note: p.note,
      verifiedAt: p.verifiedAt?.toISOString() ?? null,
      verifiedBy: p.verifiedBy?.name ?? null,
      createdAt: p.createdAt.toISOString(),
    })),
    events: row.events.map((e) => ({
      id: e.id,
      type: e.type,
      from: e.from,
      to: e.to,
      note: e.note,
      by: e.byUser?.name ?? null,
      at: e.createdAt.toISOString(),
    })),
    /** What the screen may offer; the API checks again on every change. */
    nextStatuses: [...ORDER_TRANSITIONS[row.status]],
    editable: EDITABLE_STATUSES.includes(row.status),
  };
}
export type AdminOrder = ReturnType<typeof toAdminOrder>;
