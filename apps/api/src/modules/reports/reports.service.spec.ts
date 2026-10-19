import { dhakaPeriodStarts } from "./reports.service.js";

describe("dhakaPeriodStarts (PRD §6.1: today and this month, Dhaka time)", () => {
  it("uses the Dhaka calendar day, not UTC's", () => {
    // 20:30 UTC on 31 Oct is already 1 Nov 02:30 in Dhaka.
    const { today, month } = dhakaPeriodStarts(
      new Date("2026-10-31T20:30:00Z"),
    );
    expect(today.toISOString()).toBe("2026-10-31T18:00:00.000Z");
    expect(month.toISOString()).toBe("2026-10-31T18:00:00.000Z");
  });

  it("mid-month", () => {
    const { today, month } = dhakaPeriodStarts(
      new Date("2026-10-19T09:00:00Z"),
    );
    expect(today.toISOString()).toBe("2026-10-18T18:00:00.000Z");
    expect(month.toISOString()).toBe("2026-09-30T18:00:00.000Z");
  });
});
