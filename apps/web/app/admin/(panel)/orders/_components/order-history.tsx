import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import type { AdminOrder } from "@/lib/order/order-schemas";
import { formatDateTime } from "./format";

type Event = AdminOrder["events"][number];

function label(e: Event, isFirst: boolean): string {
  const t = getAdminMessages();
  const te = t.orders.event;
  const status = (s: string | null) =>
    s ? (t.orderStatus[s as keyof typeof t.orderStatus] ?? s) : "";
  const pay = (s: string | null) =>
    s ? (t.paymentStatus[s as keyof typeof t.paymentStatus] ?? s) : "";
  switch (e.type) {
    case "STATUS":
      return isFirst && !e.from
        ? te.PLACED
        : format(te.STATUS, { to: status(e.to) });
    case "CALL":
      return format(te.CALL, {
        outcome:
          t.callOutcome[e.to as keyof typeof t.callOutcome] ?? e.to ?? "",
      });
    case "PAYMENT":
      return format(te.PAYMENT, { from: pay(e.from), to: pay(e.to) });
    case "EDIT":
      return format(te.EDIT, {
        fields: (e.to ?? "")
          .split(",")
          .map(
            (f) =>
              t.orders.editFields[f as keyof typeof t.orders.editFields] ?? f,
          )
          .join(", "),
      });
    default:
      return te.NOTE;
  }
}

/** Status history, calls, notes and payment checks: who did what, when (PRD §6.4). */
export function OrderHistory({ events }: { events: AdminOrder["events"] }) {
  const t = getAdminMessages().orders;
  return (
    <ol className="flex flex-col">
      {[...events].reverse().map((e, i, all) => (
        <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
          {i < all.length - 1 && (
            <span
              aria-hidden
              className="absolute top-3 left-[5px] h-full w-px bg-border"
            />
          )}
          <span
            aria-hidden
            className={
              e.type === "STATUS"
                ? "relative mt-1.5 size-[11px] shrink-0 rounded-full bg-primary"
                : "relative mt-1.5 size-[11px] shrink-0 rounded-full border border-line-strong bg-background"
            }
          />
          <div className="flex min-w-0 flex-col">
            <span className="font-medium text-sm">
              {label(e, i === all.length - 1)}
            </span>
            {e.note && (
              <span className="whitespace-pre-line text-sm">{e.note}</span>
            )}
            <span className="text-muted-foreground text-xs">
              {formatDateTime(e.at)} · {e.by ?? t.system}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
