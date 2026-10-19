import { type PublicOrderRow, toPublicOrder } from "./orders.mapper.js";

const row: PublicOrderRow = {
  orderNumber: "AAR-24101",
  createdAt: new Date("2026-10-19T10:00:00Z"),
  status: "PENDING",
  phone: "01712345689",
  paymentMethod: "COD",
  paymentStatus: "PENDING_VERIFICATION",
  subtotal: 4000,
  discount: 0,
  deliveryCharge: 130,
  total: 4130,
  couponCode: null,
  courierName: null,
  trackingNumber: null,
  zone: { name: "Outside Dhaka", estimatedDays: "3–5 days" },
  items: [],
  payments: [{ method: "BKASH", amount: 130, status: "PENDING" }],
  events: [{ to: "PENDING", createdAt: new Date("2026-10-19T10:00:00Z") }],
};

describe("toPublicOrder", () => {
  it("masks the phone (golden rule 5)", () => {
    expect(toPublicOrder(row).phone).toBe("017••••••89");
  });

  it("subtracts a COD advance from what the courier collects", () => {
    expect(toPublicOrder(row)).toMatchObject({
      payOnDelivery: 4000,
      walletPayment: { method: "BKASH", amount: 130 },
    });
    const rejected = {
      ...row,
      payments: [{ ...row.payments[0], status: "REJECTED" as const }],
    };
    expect(toPublicOrder(rejected).payOnDelivery).toBe(4130);
  });

  it("prepaid orders collect nothing; courier shows once set", () => {
    const prepaid = {
      ...row,
      paymentMethod: "NAGAD" as const,
      courierName: "Pathao",
      trackingNumber: "PT123",
    };
    expect(toPublicOrder(prepaid)).toMatchObject({
      payOnDelivery: 0,
      courier: { name: "Pathao", trackingNumber: "PT123", trackingUrl: null },
    });
    // With the courier's link pattern set in Settings → Couriers.
    const couriers = [
      { name: "pathao", trackingUrl: "https://track.example/{tracking}" },
    ];
    expect(toPublicOrder(prepaid, couriers).courier?.trackingUrl).toBe(
      "https://track.example/PT123",
    );
  });
});
