import { maskBdPhone } from "@aaarchive/shared/phone";
import type { Prisma } from "../../generated/prisma/client.js";

// PUBLIC order shapes for the success page and tracking (PRD §5.8, §5.9).
// Picked field by field: no address, no full phone, no stock, no staff notes.

export const publicOrderSelect = {
  orderNumber: true,
  createdAt: true,
  status: true,
  phone: true,
  paymentMethod: true,
  paymentStatus: true,
  subtotal: true,
  discount: true,
  deliveryCharge: true,
  total: true,
  couponCode: true,
  courierName: true,
  trackingNumber: true,
  zone: { select: { name: true, estimatedDays: true } },
  items: {
    select: {
      productName: true,
      sizeName: true,
      colorName: true,
      unitPrice: true,
      quantity: true,
      lineTotal: true,
    },
    orderBy: { createdAt: "asc" },
  },
  payments: {
    select: { method: true, amount: true, status: true },
    orderBy: { createdAt: "asc" },
  },
  events: {
    where: { type: "STATUS" },
    select: { to: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  },
} as const satisfies Prisma.OrderSelect;

export type PublicOrderRow = Prisma.OrderGetPayload<{
  select: typeof publicOrderSelect;
}>;

export type PublicOrder = {
  orderNumber: string;
  createdAt: string;
  status: PublicOrderRow["status"];
  /** "017••••••89" (rules.md golden rule 5). */
  phone: string;
  zone: { name: string; estimatedDays: string };
  items: Array<{
    productName: string;
    sizeName: string;
    colorName: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }>;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  total: number;
  couponCode: string | null;
  paymentMethod: PublicOrderRow["paymentMethod"];
  paymentStatus: PublicOrderRow["paymentStatus"];
  /** Paid (or to be verified) by bKash/Nagad: the full amount or a COD advance. */
  walletPayment: {
    method: "BKASH" | "NAGAD";
    amount: number;
    status: "PENDING" | "VERIFIED" | "REJECTED";
  } | null;
  /** What the courier collects; 0 for prepaid orders. */
  payOnDelivery: number;
  courier: { name: string; trackingNumber: string | null } | null;
  timeline: Array<{ status: string; at: string }>;
};

export function toPublicOrder(row: PublicOrderRow): PublicOrder {
  const wallet = row.payments.find((p) => p.method !== "COD");
  const advance =
    row.paymentMethod === "COD" && wallet && wallet.status !== "REJECTED"
      ? wallet.amount
      : 0;
  return {
    orderNumber: row.orderNumber,
    createdAt: row.createdAt.toISOString(),
    status: row.status,
    phone: maskBdPhone(row.phone),
    zone: { name: row.zone.name, estimatedDays: row.zone.estimatedDays },
    items: row.items.map((i) => ({
      productName: i.productName,
      sizeName: i.sizeName,
      colorName: i.colorName,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
    })),
    subtotal: row.subtotal,
    discount: row.discount,
    deliveryCharge: row.deliveryCharge,
    total: row.total,
    couponCode: row.couponCode,
    paymentMethod: row.paymentMethod,
    paymentStatus: row.paymentStatus,
    walletPayment:
      wallet && wallet.method !== "COD"
        ? {
            method: wallet.method,
            amount: wallet.amount,
            status: wallet.status,
          }
        : null,
    payOnDelivery: row.paymentMethod === "COD" ? row.total - advance : 0,
    // Shown once the order has shipped (PRD §5.9).
    courier: row.courierName
      ? { name: row.courierName, trackingNumber: row.trackingNumber }
      : null,
    timeline: row.events
      .filter((e) => e.to)
      .map((e) => ({ status: e.to ?? "", at: e.createdAt.toISOString() })),
  };
}
