import { describe, expect, test } from "bun:test";
import { successRate } from "./customer.js";
import {
  canTransition,
  dhakaRange,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  orderBulkStatusSchema,
  orderEditSchema,
  orderNoteSchema,
  orderStatusChangeSchema,
} from "./order.js";

describe("status flow (PRD §6.4)", () => {
  test("the allowed moves", () => {
    const allowed = ORDER_STATUSES.flatMap((from) =>
      ORDER_TRANSITIONS[from].map((to) => `${from}>${to}`),
    );
    expect(allowed.sort()).toEqual(
      [
        "PENDING>CONFIRMED",
        "PENDING>CANCELLED",
        "CONFIRMED>PROCESSING",
        "CONFIRMED>CANCELLED",
        "PROCESSING>SHIPPED",
        "PROCESSING>CANCELLED",
        "SHIPPED>DELIVERED",
        "SHIPPED>CANCELLED",
        "SHIPPED>RETURNED",
      ].sort(),
    );
  });

  test("final states go nowhere; no skipping ahead or going back", () => {
    for (const to of ORDER_STATUSES) {
      expect(canTransition("DELIVERED", to)).toBe(false);
      expect(canTransition("CANCELLED", to)).toBe(false);
      expect(canTransition("RETURNED", to)).toBe(false);
    }
    expect(canTransition("PENDING", "SHIPPED")).toBe(false);
    expect(canTransition("PROCESSING", "CONFIRMED")).toBe(false);
    expect(canTransition("PENDING", "RETURNED")).toBe(false);
  });

  test("Shipped needs a courier and tracking number", () => {
    expect(orderStatusChangeSchema.safeParse({ to: "SHIPPED" }).success).toBe(
      false,
    );
    expect(
      orderStatusChangeSchema.safeParse({
        to: "SHIPPED",
        courierName: "Pathao",
        trackingNumber: "PT-1",
      }).success,
    ).toBe(true);
    expect(
      orderStatusChangeSchema.parse({ to: "CONFIRMED", note: " " }),
    ).toEqual({
      to: "CONFIRMED",
      note: undefined,
    });
  });

  test("bulk changes cannot ship", () => {
    expect(
      orderBulkStatusSchema.safeParse({ ids: ["a"], to: "SHIPPED" }).success,
    ).toBe(false);
  });
});

describe("notes and edits", () => {
  test("a call records its outcome", () => {
    expect(
      orderNoteSchema.safeParse({ type: "CALL", outcome: "NO_ANSWER" }).success,
    ).toBe(true);
    expect(orderNoteSchema.safeParse({ type: "NOTE", note: "" }).success).toBe(
      false,
    );
  });

  test("an edit must change something and never carries prices", () => {
    expect(orderEditSchema.safeParse({}).success).toBe(false);
    expect(
      orderEditSchema.safeParse({
        items: [{ variantId: "v", quantity: 1, unitPrice: 1 }],
      }).success,
    ).toBe(false);
    expect(orderEditSchema.parse({ altPhone: "+8801712345689" })).toEqual({
      altPhone: "01712345689",
    });
  });
});

describe("helpers", () => {
  test("Dhaka day range", () => {
    expect(dhakaRange("2026-10-19", "2026-10-19")).toEqual({
      gte: new Date("2026-10-18T18:00:00Z"),
      lt: new Date("2026-10-19T18:00:00Z"),
    });
    expect(dhakaRange()).toEqual({});
  });

  test("success rate of finished orders", () => {
    expect(successRate(0, 0)).toBeNull();
    expect(successRate(3, 1)).toBe(75);
    expect(successRate(2, 1)).toBe(67);
  });
});
