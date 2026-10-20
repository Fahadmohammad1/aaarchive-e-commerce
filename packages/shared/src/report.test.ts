import { expect, test } from "bun:test";
import {
  addDays,
  daySpan,
  dhakaToday,
  resolveSalesRange,
  salesReportQuerySchema,
} from "./report.js";

test("dhakaToday uses the Dhaka calendar day, not UTC's", () => {
  // 20:30 UTC on 31 Oct is already 1 Nov in Dhaka.
  expect(dhakaToday(new Date("2026-10-31T20:30:00Z"))).toBe("2026-11-01");
  expect(dhakaToday(new Date("2026-10-31T17:59:00Z"))).toBe("2026-10-31");
});

test("addDays and daySpan cross month and year ends", () => {
  expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  expect(daySpan("2026-10-01", "2026-10-31")).toBe(31);
  expect(daySpan("2026-10-05", "2026-10-05")).toBe(1);
  expect(daySpan("2026-10-05", "2026-10-04")).toBe(0);
});

test("resolveSalesRange defaults to the last 30 days with a previous period", () => {
  const r = resolveSalesRange({}, new Date("2026-10-20T06:00:00Z"));
  expect(r.from).toBe("2026-09-21");
  expect(r.to).toBe("2026-10-20");
  expect(r.days).toHaveLength(30);
  expect(r.days[0]).toBe("2026-09-21");
  expect(r.days.at(-1)).toBe("2026-10-20");
  expect(r.previousFrom).toBe("2026-08-22");
  expect(r.previousTo).toBe("2026-09-20");
});

test("resolveSalesRange keeps an explicit range", () => {
  const r = resolveSalesRange({ from: "2026-10-01", to: "2026-10-07" });
  expect(r.days).toHaveLength(7);
  expect(r.previousFrom).toBe("2026-09-24");
  expect(r.previousTo).toBe("2026-09-30");
});

test("resolveSalesRange fills a missing end", () => {
  const now = new Date("2026-10-20T06:00:00Z");
  expect(resolveSalesRange({ from: "2026-10-10" }, now).to).toBe("2026-10-20");
  expect(resolveSalesRange({ to: "2026-10-10" }, now).from).toBe("2026-09-11");
  // A start after today gives a one-day range, not a reversed one.
  const ahead = resolveSalesRange({ from: "2026-12-01" }, now);
  expect([ahead.from, ahead.to]).toEqual(["2026-12-01", "2026-12-01"]);
});

test("salesReportQuerySchema rejects bad dates and ranges", () => {
  const ok = (q: object) => salesReportQuerySchema.safeParse(q).success;
  expect(ok({})).toBe(true);
  expect(ok({ from: "2026-10-01", to: "2026-10-31" })).toBe(true);
  expect(ok({ from: "2026-02-30" })).toBe(false);
  expect(ok({ from: "20261001" })).toBe(false);
  expect(ok({ from: "2026-10-31", to: "2026-10-01" })).toBe(false);
  expect(ok({ from: "2025-01-01", to: "2026-10-01" })).toBe(false);
  expect(ok({ from: "2025-10-01", to: "2026-10-01" })).toBe(true);
  expect(ok({ from: "2026-10-01", extra: "x" })).toBe(false);
});
