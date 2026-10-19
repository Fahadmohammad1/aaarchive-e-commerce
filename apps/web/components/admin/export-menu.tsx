"use client";

import type { ExportFormat } from "@aaarchive/shared/export";
import { useMutation } from "@tanstack/react-query";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { errorText } from "@/lib/i18n/error-text";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";

type ExportMenuProps = {
  /** Fetches the file (with the screen's current filters). */
  onExport: (format: ExportFormat) => Promise<{ blob: Blob; filename: string }>;
  /** Button text when a screen has more than one export (default "Export"). */
  label?: string;
};

/** Saves a downloaded file under the server's file name. */
function saveFile({ blob, filename }: { blob: Blob; filename: string }) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before freeing it.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * "Export" → CSV / Excel (PRD §6.9, docs/architecture.md §4.8). The bearer
 * token lives in memory, so the file is fetched through lib/api, not an
 * <a href>.
 */
export function ExportMenu({ onExport, label }: ExportMenuProps) {
  const t = getAdminMessages().export;
  const [problem, setProblem] = React.useState<string | null>(null);
  const run = useMutation({
    mutationFn: onExport,
    onMutate: () => setProblem(null),
    onSuccess: saveFile,
    onError: (error) => setProblem(errorText(error)),
  });

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="lg" disabled={run.isPending}>
            <Download />
            {run.isPending ? t.preparing : (label ?? t.label)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => run.mutate("csv")}>
            <FileText />
            {t.csv}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => run.mutate("xlsx")}>
            <FileSpreadsheet />
            {t.xlsx}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {problem && (
        <p
          role="alert"
          className="max-w-xs text-right text-destructive text-xs"
        >
          {problem}
        </p>
      )}
    </div>
  );
}
