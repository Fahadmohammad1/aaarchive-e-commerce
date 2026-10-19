"use client";

import { X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReturnFocus } from "@/lib/a11y/use-return-focus";
import { getMessages } from "@/lib/i18n/i18n";

/**
 * Size chart modal (design §5.15, §7.2): mono numbers, striped rows. Loaded
 * on the first tap of "Size chart" (variant-picker.tsx).
 */
export function SizeChartDialog({
  chart,
  open,
  onOpenChange,
}: {
  chart: { columns: string[]; rows: string[][] };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const returnFocus = useReturnFocus();
  const t = getMessages().pdp;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        {...returnFocus}
        showCloseButton={false}
        className="max-w-[calc(100%-2rem)] gap-4 rounded-none border border-border bg-card p-5 ring-0 sm:max-w-[720px]"
      >
        <div className="flex items-start justify-between gap-4">
          <DialogTitle className="type-display-sm">
            {t.sizeChartTitle}
          </DialogTitle>
          <DialogClose
            aria-label={t.closeZoom}
            className="flex size-8 shrink-0 items-center justify-center bg-primary text-primary-foreground"
          >
            <X aria-hidden strokeWidth={1.5} className="size-4" />
          </DialogClose>
        </div>
        <DialogDescription className="text-muted-foreground type-mono-micro">
          {t.howToMeasure}
        </DialogDescription>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse">
            <thead>
              <tr className="border-b">
                {chart.columns.map((c) => (
                  <th
                    key={c}
                    scope="col"
                    className="px-3 py-2 text-left type-mono-label uppercase"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((row) => (
                <tr key={row[0]} className="even:bg-sunken">
                  {row.map((cell, i) =>
                    i === 0 ? (
                      <th
                        key={`${row[0]}-h`}
                        scope="row"
                        className="px-3 py-2 text-left type-mono-label"
                      >
                        {cell}
                      </th>
                    ) : (
                      // biome-ignore lint/suspicious/noArrayIndexKey: fixed table cells
                      <td key={i} className="px-3 py-2 font-mono text-sm">
                        {cell || "—"}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
