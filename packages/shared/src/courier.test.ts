import { describe, expect, test } from "bun:test";
import { courierSettingsSchema, courierTrackingUrl } from "./settings.js";

describe("couriers", () => {
  const couriers = courierSettingsSchema.parse({
    couriers: [
      { name: "Steadfast", trackingUrl: "https://track.example/t/{tracking}" },
      { name: "Pathao" },
    ],
  }).couriers;

  test("builds the tracking link, matching the name in any case", () => {
    expect(courierTrackingUrl(couriers, "steadfast", "SF 12/3")).toBe(
      "https://track.example/t/SF%2012%2F3",
    );
    expect(courierTrackingUrl(couriers, "Pathao", "P1")).toBeNull();
    expect(courierTrackingUrl(couriers, "Unknown", "X")).toBeNull();
    expect(courierTrackingUrl(couriers, "Steadfast", null)).toBeNull();
  });

  test("only https links with the placeholder; no duplicate names", () => {
    const bad = (trackingUrl: string) =>
      courierSettingsSchema.safeParse({
        couriers: [{ name: "A", trackingUrl }],
      }).success;
    expect(bad("http://x.example/{tracking}")).toBe(false);
    expect(bad("https://x.example/track")).toBe(false);
    expect(bad("javascript:alert(1)//{tracking}")).toBe(false);
    expect(bad("https://x.example/{tracking}")).toBe(true);
    expect(
      courierSettingsSchema.safeParse({
        couriers: [{ name: "RedX" }, { name: "redx" }],
      }).success,
    ).toBe(false);
    expect(courierSettingsSchema.parse({})).toEqual({ couriers: [] });
  });
});
