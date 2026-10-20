// Public order shape from POST /orders and POST /orders/track
// (apps/api orders.mapper.ts). The phone arrives masked.

export type PublicOrder = {
  orderNumber: string;
  createdAt: string;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED"
    | "RETURNED";
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
  paymentMethod: "COD" | "BKASH" | "NAGAD" | "SSLCOMMERZ";
  paymentStatus:
    | "UNPAID"
    | "PENDING_VERIFICATION"
    | "PAID"
    | "REFUNDED"
    | "PARTIALLY_PAID";
  walletPayment: {
    method: "BKASH" | "NAGAD";
    amount: number;
    status: "PENDING" | "VERIFIED" | "REJECTED";
  } | null;
  payOnDelivery: number;
  courier: {
    name: string;
    trackingNumber: string | null;
    trackingUrl: string | null;
  } | null;
  timeline: Array<{ status: string; at: string }>;
};

/** POST /orders: online payment adds the SSLCommerz page to send the customer to. */
export type PlacedOrder = PublicOrder & { paymentUrl?: string };
