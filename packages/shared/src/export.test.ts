import { expect, test } from "bun:test";
import { EXPORT_MAX_ROWS, exportFormatSchema } from "./export.js";
import { productExportQuerySchema } from "./product.js";

test("export formats are csv and xlsx only", () => {
  expect(exportFormatSchema.options).toEqual(["csv", "xlsx"]);
  expect(exportFormatSchema.safeParse("pdf").success).toBe(false);
  expect(EXPORT_MAX_ROWS).toBe(50_000);
});

test("the products export takes the list filters, never paging", () => {
  expect(
    productExportQuerySchema.parse({ format: "xlsx", stock: "low" }),
  ).toEqual({ format: "xlsx", stock: "low", sort: "updated" });
  expect(
    productExportQuerySchema.safeParse({ format: "csv", page: "2" }).success,
  ).toBe(false);
});
