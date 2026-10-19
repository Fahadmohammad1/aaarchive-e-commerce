"use client";

import { CALL_OUTCOMES } from "@aaarchive/shared/order";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { errorText } from "@/lib/i18n/error-text";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { useAddOrderNote } from "@/lib/order/use-admin-orders";

/** Call outcomes as big tap targets, plus an internal note (PRD §6.4). */
export function CallAndNotes({ orderId }: { orderId: string }) {
  const t = getAdminMessages();
  const to = t.orders;
  const add = useAddOrderNote(orderId);
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const run = async (body: Parameters<typeof add.mutateAsync>[0]) => {
    setError(null);
    try {
      await add.mutateAsync(body);
      return true;
    } catch (e) {
      setError(errorText(e));
      return false;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-xs">{to.callHint}</p>
        <div className="grid gap-2">
          {CALL_OUTCOMES.map((outcome) => (
            <Button
              key={outcome}
              variant="outline"
              size="lg"
              className="h-12 justify-start"
              disabled={add.isPending}
              onClick={() => void run({ type: "CALL", outcome })}
            >
              {t.callOutcome[outcome]}
            </Button>
          ))}
        </div>
      </div>
      <form
        className="flex flex-col gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!note.trim()) return;
          if (await run({ type: "NOTE", note: note.trim() })) setNote("");
        }}
      >
        <label htmlFor={`note-${orderId}`} className="font-medium text-sm">
          {to.notesTitle}
        </label>
        <Textarea
          id={`note-${orderId}`}
          rows={3}
          maxLength={1000}
          placeholder={to.notePlaceholder}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          type="submit"
          size="lg"
          disabled={!note.trim() || add.isPending}
          className="self-end"
        >
          {to.addNote}
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
