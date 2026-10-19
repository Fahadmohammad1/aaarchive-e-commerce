"use client";

import type * as React from "react";
import { Button } from "@/components/ui/button";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";

/** Form frame: fields (disabled for staff), Save, result line. */
export function SectionShell({
  canEdit,
  saving,
  message,
  onSubmit,
  children,
}: {
  canEdit: boolean;
  saving: boolean;
  message: { ok: boolean; text: string } | null;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  children: React.ReactNode;
}) {
  const t = getAdminMessages();
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex max-w-3xl flex-col gap-6"
    >
      <fieldset
        disabled={!canEdit}
        className="flex flex-col gap-6 disabled:opacity-80"
      >
        {children}
      </fieldset>
      {canEdit ? (
        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t bg-background py-3">
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? t.saving : t.save}
          </Button>
          {message && (
            <span
              role={message.ok ? "status" : "alert"}
              className={
                message.ok ? "text-sm text-success" : "text-destructive text-sm"
              }
            >
              {message.text}
            </span>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          {t.content.readOnlyNote}
        </p>
      )}
    </form>
  );
}
