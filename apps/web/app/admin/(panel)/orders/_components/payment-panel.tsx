"use client";

import { formatTaka } from "@aaarchive/shared/money";
import * as React from "react";
import { FormField } from "@/components/admin/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { errorText } from "@/lib/i18n/error-text";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { useDecidePayment } from "@/lib/payment/use-payments";
import { formatDateTime } from "./format";

export type PaymentRecord = {
  id: string;
  method: "COD" | "BKASH" | "NAGAD";
  amount: number;
  senderNumber: string | null;
  trxId: string | null;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  note: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
};

/** One bKash/Nagad record with Verify / Reject (PRD §6.4). */
export function PaymentRecordCard({
  payment,
  isAdvance,
}: {
  payment: PaymentRecord;
  isAdvance: boolean;
}) {
  const t = getAdminMessages();
  const to = t.orders;
  const decide = useDecidePayment();
  const [mode, setMode] = React.useState<"verify" | "reject" | null>(null);
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const method = t.paymentMethod[payment.method];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mode) return;
    if (mode === "reject" && !note.trim()) {
      setError(t.errors.REQUIRED);
      return;
    }
    setError(null);
    try {
      await decide.mutateAsync({
        id: payment.id,
        decision: mode,
        note: note.trim() || undefined,
      });
      setMode(null);
      setNote("");
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">
          {method} · {isAdvance ? to.advance : to.fullAmount}
        </span>
        <Badge
          variant="outline"
          className={
            payment.status === "VERIFIED"
              ? "border-success text-success"
              : payment.status === "REJECTED"
                ? "border-destructive text-destructive"
                : "border-primary text-primary"
          }
        >
          {t.paymentRecord[payment.status]}
        </Badge>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted-foreground">{to.amount}</dt>
        <dd className="font-mono">{formatTaka(payment.amount)}</dd>
        <dt className="text-muted-foreground">{to.sender}</dt>
        <dd className="font-mono">{payment.senderNumber ?? "—"}</dd>
        <dt className="text-muted-foreground">{to.trxId}</dt>
        <dd className="font-mono text-base tracking-wide">
          {payment.trxId ?? "—"}
        </dd>
      </dl>
      {payment.status !== "PENDING" && payment.verifiedAt && (
        <p className="text-muted-foreground text-xs">
          {format(to.checkedBy, {
            status: t.paymentRecord[payment.status],
            name: payment.verifiedBy ?? "—",
            date: formatDateTime(payment.verifiedAt),
          })}
          {payment.note && ` — ${payment.note}`}
        </p>
      )}
      {payment.status === "PENDING" && (
        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" className="h-12" onClick={() => setMode("verify")}>
            {to.verify}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12 border-destructive/60 text-destructive"
            onClick={() => setMode("reject")}
          >
            {to.reject}
          </Button>
        </div>
      )}
      <Dialog
        open={mode !== null}
        onOpenChange={(open) => !open && setMode(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {mode === "reject" ? to.rejectTitle : to.verifyTitle}
            </DialogTitle>
            <DialogDescription>
              {format(to.verifyHint, { method })} {payment.trxId} ·{" "}
              {formatTaka(payment.amount)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <FormField
              id={`pay-note-${payment.id}`}
              label={to.decisionNote}
              hint={mode === "reject" ? to.rejectNoteHint : t.common.optional}
            >
              <Textarea
                id={`pay-note-${payment.id}`}
                rows={2}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </FormField>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setMode(null)}
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                size="lg"
                variant={mode === "reject" ? "destructive" : "default"}
                disabled={decide.isPending}
              >
                {mode === "reject" ? to.reject : to.verify}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
