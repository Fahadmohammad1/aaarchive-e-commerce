import { z } from "zod";

// CSV / Excel exports (PRD §6.9). The API generates them; the web asks with
// the list screen's filters plus `format`.

export const EXPORT_FORMATS = ["csv", "xlsx"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
export const exportFormatSchema = z.enum(EXPORT_FORMATS);

/** Hard cap per export (PRD §6.9 rule 6); above it the API asks for narrower filters. */
export const EXPORT_MAX_ROWS = 50_000;
