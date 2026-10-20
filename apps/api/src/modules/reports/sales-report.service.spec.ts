import { fillDays } from "./sales-report.service.js";

describe("fillDays (sales analytics daily series)", () => {
  it("returns every day of the range in order, zeros where nothing sold", () => {
    const rows = [
      { date: "2026-10-03", orders: 2, grossSales: 2500, revenue: 1250 },
      { date: "2026-10-01", orders: 1, grossSales: 990, revenue: 0 },
    ];
    expect(fillDays(["2026-10-01", "2026-10-02", "2026-10-03"], rows)).toEqual([
      { date: "2026-10-01", orders: 1, grossSales: 990, revenue: 0 },
      { date: "2026-10-02", orders: 0, grossSales: 0, revenue: 0 },
      { date: "2026-10-03", orders: 2, grossSales: 2500, revenue: 1250 },
    ]);
  });

  it("drops rows outside the range", () => {
    const rows = [{ date: "2026-09-30", orders: 5, grossSales: 1, revenue: 1 }];
    expect(fillDays(["2026-10-01"], rows)).toEqual([
      { date: "2026-10-01", orders: 0, grossSales: 0, revenue: 0 },
    ]);
  });
});
