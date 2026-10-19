import { formatTaka } from "@aaarchive/shared/money";
import type { Mail } from "../mail/mail.service.js";
import type { PublicOrder } from "./orders.mapper.js";

const METHOD: Record<PublicOrder["paymentMethod"], string> = {
  COD: "Cash on Delivery",
  BKASH: "bKash",
  NAGAD: "Nagad",
};

/** Customer text is escaped: names and product names come from people. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Order confirmation (PRD §5.8, §11). Plain and short: customers rarely read email. */
export function orderConfirmationMail(
  order: PublicOrder,
  name: string,
  to: string,
): Mail {
  const lines = order.items.map(
    (i) =>
      `${i.productName} (${i.sizeName}, ${i.colorName}) × ${i.quantity} — ${formatTaka(i.lineTotal)}`,
  );
  const totals = [
    `Subtotal: ${formatTaka(order.subtotal)}`,
    ...(order.discount > 0 ? [`Discount: −${formatTaka(order.discount)}`] : []),
    `Delivery: ${formatTaka(order.deliveryCharge)}`,
    `Total: ${formatTaka(order.total)}`,
  ];
  const payment =
    order.paymentMethod === "COD"
      ? `Pay ${formatTaka(order.payOnDelivery)} to the courier on delivery.`
      : `${METHOD[order.paymentMethod]} payment received for checking. We will confirm it shortly.`;
  const closing = "We will call you to confirm your order.";

  const text = [
    `Hi ${name},`,
    "",
    `Thank you for your order ${order.orderNumber}.`,
    "",
    ...lines,
    "",
    ...totals,
    "",
    payment,
    closing,
    "",
    "Aaarchive",
  ].join("\n");

  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1a1714;line-height:1.5">
<p>Hi ${esc(name)},</p>
<p>Thank you for your order <strong>${esc(order.orderNumber)}</strong>.</p>
<ul>${lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
<p>${totals.map(esc).join("<br>")}</p>
<p>${esc(payment)}<br>${esc(closing)}</p>
<p>Aaarchive</p>
</body></html>`;

  return {
    to,
    subject: `Your Aaarchive order ${order.orderNumber}`,
    html,
    text,
  };
}

const STATUS_LINE: Partial<Record<string, string>> = {
  CONFIRMED: "Your order is confirmed. We are getting it ready.",
  SHIPPED: "Your order is on its way.",
  DELIVERED: "Your order was delivered. Thank you for shopping with Aaarchive.",
};

/** Confirmed / shipped / delivered (PRD §11). */
export function orderStatusMail(o: {
  orderNumber: string;
  name: string;
  to: string;
  status: string;
  courierName: string | null;
  trackingNumber: string | null;
}): Mail {
  const lines = [
    `Hi ${o.name},`,
    "",
    `${STATUS_LINE[o.status] ?? ""} (${o.orderNumber})`,
    ...(o.courierName
      ? [
          "",
          `Courier: ${o.courierName}${o.trackingNumber ? ` — tracking number ${o.trackingNumber}` : ""}`,
        ]
      : []),
    "",
    "Aaarchive",
  ];
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1a1714;line-height:1.5">${lines
    .map((l) => (l ? `<p>${esc(l)}</p>` : ""))
    .join("")}</body></html>`;
  return {
    to: o.to,
    subject: `Aaarchive order ${o.orderNumber}`,
    html,
    text: lines.join("\n"),
  };
}
