import { EXPORT_MAX_ROWS, type ExportFormat } from "@aaarchive/shared/export";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type { Response } from "express";
import { csvChunks } from "./csv-writer.js";
import { type ExportColumn, exportDateStamp } from "./export-columns.js";
import { writeXlsx } from "./xlsx-writer.js";

const CONTENT_TYPE: Record<ExportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export type ExportRequest<T> = {
  /** e.g. "products" → aaarchive-products-2026-10-19.csv */
  resource: string;
  format: ExportFormat;
  columns: ExportColumn<T>[];
  /** Rows the filters match; above EXPORT_MAX_ROWS the export is refused. */
  total: number;
  rows: AsyncIterable<T>;
};

/** Pages through a query 1,000 rows at a time (docs/architecture.md §4.8). */
export async function* paginate<T>(
  fetchPage: (skip: number, take: number) => Promise<T[]>,
  pageSize = 1000,
): AsyncGenerator<T> {
  for (let skip = 0; ; skip += pageSize) {
    const page = await fetchPage(skip, pageSize);
    yield* page;
    if (page.length < pageSize) return;
  }
}

/** Streams CSV / Excel exports (PRD §6.9). */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  async stream<T>(res: Response, request: ExportRequest<T>): Promise<void> {
    if (request.total > EXPORT_MAX_ROWS) {
      throw new BadRequestException({
        message: `Exports are limited to ${EXPORT_MAX_ROWS} rows`,
        code: "EXPORT_TOO_LARGE",
        details: { total: request.total, max: EXPORT_MAX_ROWS },
      });
    }
    const filename = `aaarchive-${request.resource}-${exportDateStamp()}.${request.format}`;
    res.status(200);
    res.setHeader("Content-Type", CONTENT_TYPE[request.format]);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    // Exports hold stock numbers and customer data: never cache them.
    res.setHeader("Cache-Control", "no-store");
    try {
      if (request.format === "csv") {
        for await (const chunk of csvChunks(request.columns, request.rows)) {
          if (!res.write(chunk)) {
            await new Promise<void>((resolve) => res.once("drain", resolve));
          }
        }
        res.end();
      } else {
        await writeXlsx(res, request.resource, request.columns, request.rows);
      }
    } catch (error) {
      // Headers are already sent: the only honest signal left is a broken
      // download, never a file that looks complete.
      this.logger.error(`Export of ${request.resource} failed`, error);
      res.destroy(error instanceof Error ? error : undefined);
    }
  }
}
