"use client";

import type { OrderStatus } from "@aaarchive/shared/order";
import { STOCK_RESTORING_STATUSES } from "@aaarchive/shared/order";
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
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/api-error";
import { errorText } from "@/lib/i18n/error-text";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import type { AdminOrder } from "@/lib/order/order-schemas";
import { useChangeOrderStatus } from "@/lib/order/use-admin-orders";
import { useCouriers } from "@/lib/settings/use-couriers";

const DANGER: OrderStatus[] = ["CANCELLED", "RETURNED"];

/** One button per allowed next status (PRD §6.4); each opens a short confirm. */
export function StatusActions({
  order,
  onConflict,
}: {
  order: AdminOrder;
  onConflict: () => void;
}) {
  const t = getAdminMessages();
  const to = t.orders;
  const change = useChangeOrderStatus(order.id);
  // Suggestions from Delivery zones → Couriers; any other name can be typed.
  const couriers = useCouriers();
  const [target, setTarget] = React.useState<OrderStatus | null>(null);
  const [note, setNote] = React.useState("");
  const [courierName, setCourierName] = React.useState(order.courierName ?? "");
  const [trackingNumber, setTrackingNumber] = React.useState(
    order.trackingNumber ?? "",
  );
  const [error, setError] = React.useState<string | null>(null);

  if (order.nextStatuses.length === 0) {
    return <p className="text-muted-foreground text-sm">{to.finished}</p>;
  }

  const shipping = target === "SHIPPED";
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!target) return;
    setError(null);
    if (shipping && (!courierName.trim() || !trackingNumber.trim())) {
      setError(t.errors.REQUIRED);
      return;
    }
    try {
      await change.mutateAsync({
        to: target,
        note: note.trim() || undefined,
        ...(shipping
          ? {
              courierName: courierName.trim(),
              trackingNumber: trackingNumber.trim(),
            }
          : {}),
      });
      setTarget(null);
      setNote("");
    } catch (e) {
      if (
        ApiError.isApiError(e) &&
        ["STATUS_CHANGED", "INVALID_TRANSITION"].includes(e.code)
      ) {
        onConflict();
      }
      setError(errorText(e));
    }
  };

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        {order.nextStatuses.map((s) => (
          <Button
            key={s}
            size="lg"
            variant={DANGER.includes(s) ? "outline" : "default"}
            className={
              DANGER.includes(s)
                ? "h-12 border-destructive/60 text-destructive"
                : "h-12"
            }
            onClick={() => {
              setError(null);
              setTarget(s);
            }}
          >
            {to.moveTo[s]}
          </Button>
        ))}
      </div>
      <Dialog
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{target ? to.moveTo[target] : ""}</DialogTitle>
            <DialogDescription>
              {order.orderNumber} · {order.customerName}
              {target && STOCK_RESTORING_STATUSES.includes(target) && (
                <span className="mt-1 block">{to.restoresStock}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="flex flex-col gap-4">
            {shipping && (
              <>
                <FormField id="ship-courier" label={to.courierName}>
                  <Input
                    id="ship-courier"
                    list="ship-courier-options"
                    autoComplete="off"
                    value={courierName}
                    maxLength={40}
                    onChange={(e) => setCourierName(e.target.value)}
                    className="h-11"
                  />
                  <datalist id="ship-courier-options">
                    {couriers.data?.couriers.map((c) => (
                      <option key={c.name} value={c.name} />
                    ))}
                  </datalist>
                </FormField>
                <FormField id="ship-tracking" label={to.trackingNumber}>
                  <Input
                    id="ship-tracking"
                    value={trackingNumber}
                    maxLength={60}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="h-11 font-mono"
                  />
                </FormField>
              </>
            )}
            <FormField id="status-note" label={to.statusNote}>
              <Textarea
                id="status-note"
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
                onClick={() => setTarget(null)}
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={change.isPending}
                variant={
                  target && DANGER.includes(target) ? "destructive" : "default"
                }
              >
                {change.isPending ? t.saving : target ? to.moveTo[target] : ""}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
