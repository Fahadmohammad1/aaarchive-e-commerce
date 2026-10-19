import { formatTaka } from "@aaarchive/shared/money";
import type { AdminCoupon } from "@/lib/coupon/coupon-schemas";
import { format } from "@/lib/i18n/i18n";
import type { getAdminMessages } from "@/lib/i18n/i18n-admin";

type Messages = ReturnType<typeof getAdminMessages>["coupons"];

const day = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function discountLabel(c: AdminCoupon, t: Messages): string {
  return c.type === "PERCENT"
    ? format(t.discountPercent, { value: c.value })
    : format(t.discountFixed, { value: formatTaka(c.value) });
}

export function datesLabel(c: AdminCoupon, t: Messages): string {
  const from = c.startsAt
    ? format(t.from, { date: day.format(new Date(c.startsAt)) })
    : "";
  const until = c.endsAt
    ? format(t.until, { date: day.format(new Date(c.endsAt)) })
    : "";
  return [from, until].filter(Boolean).join(" · ") || t.always;
}

export function limitsLabel(c: AdminCoupon, t: Messages): string {
  const parts = [
    c.minOrder > 0 ? format(t.min, { value: formatTaka(c.minOrder) }) : "",
    c.perPhoneLimit != null
      ? format(t.perPhone, { count: c.perPhoneLimit })
      : "",
  ].filter(Boolean);
  return parts.join(" · ") || t.noLimit;
}

/** "3 / 100" or just "3". */
export function usageLabel(c: AdminCoupon): string {
  return c.usageLimit != null
    ? `${c.usedCount} / ${c.usageLimit}`
    : String(c.usedCount);
}
