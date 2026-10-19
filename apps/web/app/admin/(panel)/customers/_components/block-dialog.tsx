"use client";

import { normalizeBdPhone } from "@aaarchive/shared/phone";
import * as React from "react";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useReturnFocus } from "@/lib/a11y/use-return-focus";
import { useBlockPhone } from "@/lib/customer/use-customers";
import { errorText } from "@/lib/i18n/error-text";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";

/** Block a number from Cash on Delivery, with a reason (PRD §6.5). */
export function BlockDialog({
  open,
  onOpenChange,
  phone: fixedPhone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Set when blocking from a customer page; otherwise typed in. */
  phone?: string;
}) {
  const returnFocus = useReturnFocus();
  const t = getAdminMessages();
  const tc = t.customers;
  const block = useBlockPhone();
  const [phone, setPhone] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setPhone(fixedPhone ?? "");
    setReason("");
    setError(null);
  }, [open, fixedPhone]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!normalizeBdPhone(phone)) {
      setError(t.errors.INVALID_BD_PHONE);
      return;
    }
    if (!reason.trim()) {
      setError(t.errors.REQUIRED);
      return;
    }
    try {
      await block.mutateAsync({ phone, reason: reason.trim() });
      onOpenChange(false);
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent {...returnFocus} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {fixedPhone
              ? format(tc.blockTitle, { phone: fixedPhone })
              : tc.addBlock}
          </DialogTitle>
          <DialogDescription>{tc.blockHint}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {!fixedPhone && (
            <FormField id="block-phone" label={tc.phone}>
              <Input
                id="block-phone"
                type="tel"
                inputMode="tel"
                placeholder="01XXXXXXXXX"
                className="h-11 font-mono"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </FormField>
          )}
          <FormField id="block-reason" label={tc.reason}>
            <Input
              id="block-reason"
              maxLength={200}
              className="h-11"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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
              onClick={() => onOpenChange(false)}
            >
              {t.common.cancel}
            </Button>
            <Button
              type="submit"
              size="lg"
              variant="destructive"
              disabled={block.isPending}
            >
              {tc.block}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
