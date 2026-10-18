import type { Writable } from "node:stream";
import ExcelJS from "exceljs";
import { guardFormula } from "./csv-writer.js";
import { cellOf, type ExportColumn } from "./export-columns.js";

/**
 * Streams an .xlsx with a bold, frozen header, column widths and `#,##0` for
 * money (PRD §6.9 rule 5). Rows are committed as they come, so memory stays
 * flat however long the export is.
 */
export async function writeXlsx<T>(
  out: Writable,
  sheetName: string,
  columns: ExportColumn<T>[],
  rows: AsyncIterable<T>,
): Promise<void> {
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: out,
    useStyles: true,
    useSharedStrings: false,
  });
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = columns.map((c, i) => ({
    key: String(i),
    width: c.width ?? Math.max(10, c.header.length + 2),
    style: c.type === "money" ? { numFmt: "#,##0" } : {},
  }));
  const header = sheet.addRow(columns.map((c) => c.header));
  header.font = { bold: true };
  header.commit();
  for await (const row of rows) {
    sheet
      .addRow(
        columns.map((c) => {
          const cell = cellOf(c, row);
          // Excel can also run "=…" typed into a text cell on edit.
          return typeof cell === "string" ? guardFormula(cell) : cell;
        }),
      )
      .commit();
  }
  sheet.commit();
  await workbook.commit();
}
