import { PassThrough } from "node:stream";
import ExcelJS from "exceljs";
import type { Response } from "express";
import {
  CSV_BOM,
  csvChunks,
  csvField,
  csvLine,
  csvPhone,
  guardFormula,
} from "./csv-writer.js";
import { ExportService, paginate } from "./export.service.js";
import {
  cellOf,
  type ExportColumn,
  formatExportDate,
} from "./export-columns.js";
import { writeXlsx } from "./xlsx-writer.js";

type Row = { name: string; price: number; at: Date; note: string | null };

const columns: ExportColumn<Row>[] = [
  { header: "Product", type: "text", width: 30, value: (r) => r.name },
  { header: "Price", type: "money", value: (r) => r.price },
  { header: "Date", type: "date", value: (r) => r.at },
  { header: "Note", type: "text", value: (r) => r.note },
];
const rows: Row[] = [
  {
    name: 'Hoodie, "Classic"',
    price: 2490,
    at: new Date("2026-10-18T20:30:00Z"),
    note: null,
  },
  {
    name: '=HYPERLINK("x")',
    price: -250,
    at: new Date("2026-10-19T00:05:00Z"),
    note: "পাঞ্জাবি",
  },
];

async function* iterate<T>(items: T[]) {
  yield* items;
}

async function collect(stream: PassThrough): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

describe("export cells", () => {
  it("formats dates in Dhaka time and keeps money a number", () => {
    expect(formatExportDate(new Date("2026-10-18T20:30:00Z"))).toBe(
      "2026-10-19 02:30",
    );
    expect(cellOf(columns[1] as ExportColumn<Row>, rows[1] as Row)).toBe(-250);
    expect(cellOf(columns[3] as ExportColumn<Row>, rows[0] as Row)).toBeNull();
  });

  it("guards formulas in text and quotes per RFC 4180", () => {
    expect(guardFormula("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(guardFormula("+880")).toBe("'+880");
    expect(guardFormula("@x")).toBe("'@x");
    expect(guardFormula("Hoodie")).toBe("Hoodie");
    expect(csvField('Hoodie, "Classic"')).toBe('"Hoodie, ""Classic"""');
    expect(csvField(-250)).toBe("-250");
    expect(csvField(null)).toBe("");
  });

  it("keeps the leading 0 of phone numbers for spreadsheets", () => {
    expect(csvPhone("01712345689")).toBe('"=""01712345689"""');
    // Anything that is not plain digits is written as normal guarded text.
    expect(csvPhone("=1+1")).toBe("'=1+1");
    expect(csvPhone(null)).toBe("");
    expect(csvLine(["01712345689", "01712345689"], ["phone", "text"])).toBe(
      '"=""01712345689""",01712345689\r\n',
    );
  });

  it("writes a BOM, a header and one CRLF line per row", async () => {
    let csv = "";
    for await (const chunk of csvChunks(columns, iterate(rows))) csv += chunk;
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    expect(csv.slice(1).split("\r\n")).toEqual([
      "Product,Price,Date,Note",
      '"Hoodie, ""Classic""",2490,2026-10-19 02:30,',
      '"\'=HYPERLINK(""x"")",-250,2026-10-19 06:05,পাঞ্জাবি',
      "",
    ]);
  });
});

describe("writeXlsx", () => {
  it("writes a bold frozen header, widths, money format and guarded text", async () => {
    const out = new PassThrough();
    const done = collect(out);
    await writeXlsx(out, "products", columns, iterate(rows));
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await done) as unknown as ArrayBuffer);
    const sheet = workbook.getWorksheet("products");
    expect(sheet?.getRow(1).getCell(1).value).toBe("Product");
    expect(sheet?.getRow(1).font?.bold).toBe(true);
    expect(sheet?.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
    expect(sheet?.getColumn(1).width).toBe(30);
    expect(sheet?.getRow(2).getCell(2).value).toBe(2490);
    expect(sheet?.getRow(2).getCell(2).numFmt).toBe("#,##0");
    expect(sheet?.getRow(3).getCell(1).value).toBe('\'=HYPERLINK("x")');
    expect(sheet?.getRow(3).getCell(4).value).toBe("পাঞ্জাবি");
  });
});

describe("ExportService", () => {
  function fakeResponse() {
    const res = new PassThrough() as PassThrough & {
      headers: Record<string, string>;
      statusCode: number;
    };
    res.headers = {};
    Object.assign(res, {
      status(code: number) {
        res.statusCode = code;
        return res;
      },
      setHeader(name: string, value: string) {
        res.headers[name.toLowerCase()] = value;
      },
    });
    return res;
  }

  it("streams a CSV with a dated file name and no caching", async () => {
    const res = fakeResponse();
    const body = collect(res);
    await new ExportService().stream(res as unknown as Response, {
      resource: "products",
      format: "csv",
      columns,
      total: rows.length,
      rows: iterate(rows),
    });
    expect(res.headers["content-type"]).toBe("text/csv; charset=utf-8");
    expect(res.headers["content-disposition"]).toMatch(
      /^attachment; filename="aaarchive-products-\d{4}-\d{2}-\d{2}\.csv"$/,
    );
    expect(res.headers["cache-control"]).toBe("no-store");
    expect((await body).toString("utf8")).toContain("Product,Price");
  });

  it("refuses more than 50,000 rows before sending anything", async () => {
    const res = fakeResponse();
    await expect(
      new ExportService().stream(res as unknown as Response, {
        resource: "products",
        format: "csv",
        columns,
        total: 50_001,
        rows: iterate([]),
      }),
    ).rejects.toMatchObject({ response: { code: "EXPORT_TOO_LARGE" } });
    expect(res.headers).toEqual({});
  });

  it("paginate walks pages until a short one", async () => {
    const calls: number[] = [];
    const items: number[] = [];
    for await (const n of paginate(async (skip, take) => {
      calls.push(skip);
      return Array.from(
        { length: Math.max(0, Math.min(take, 5 - skip)) },
        (_, i) => skip + i,
      );
    }, 2)) {
      items.push(n);
    }
    expect(items).toEqual([0, 1, 2, 3, 4]);
    expect(calls).toEqual([0, 2, 4]);
  });
});
