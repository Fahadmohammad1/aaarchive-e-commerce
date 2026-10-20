// What SSLCommerz's validation API answered, judged against the payment we
// expect (owner, 2026-10-21). Only this answer — fetched by the API from
// SSLCommerz with our store password — can mark an order paid; whatever the
// browser posts to the return URLs is only a hint to go and ask.

export type ValidationOutcome =
  /** Paid in full: the order becomes Paid. */
  | { outcome: "paid" }
  /** Paid, but SSLCommerz flags it as risky: staff check it before it counts. */
  | { outcome: "risky" }
  | { outcome: "invalid"; reason: string };

const PAID_STATUSES = new Set(["VALID", "VALIDATED"]);

export function judgeValidation(
  answer: Record<string, unknown>,
  expected: { tranId: string; amount: number },
): ValidationOutcome {
  const status = String(answer.status ?? "");
  if (!PAID_STATUSES.has(status)) {
    return { outcome: "invalid", reason: `status ${status || "missing"}` };
  }
  if (answer.tran_id !== expected.tranId) {
    return { outcome: "invalid", reason: "transaction id mismatch" };
  }
  const currency = String(answer.currency_type ?? answer.currency ?? "");
  if (currency !== "BDT") {
    return { outcome: "invalid", reason: `currency ${currency || "missing"}` };
  }
  // `amount` is in taka with two decimals ("1250.00"); orders are whole taka.
  const paisa = Math.round(Number(answer.amount) * 100);
  if (!Number.isFinite(paisa) || paisa !== expected.amount * 100) {
    return { outcome: "invalid", reason: "amount mismatch" };
  }
  if (String(answer.risk_level ?? "0") === "1") return { outcome: "risky" };
  return { outcome: "paid" };
}

/** A paid validation id among the transactions found for one tran_id, if any. */
export function paidValIdFrom(answer: Record<string, unknown>): string | null {
  const elements = Array.isArray(answer.element) ? answer.element : [];
  for (const element of elements) {
    if (
      element &&
      typeof element === "object" &&
      PAID_STATUSES.has(String((element as { status?: unknown }).status)) &&
      typeof (element as { val_id?: unknown }).val_id === "string"
    ) {
      return (element as { val_id: string }).val_id;
    }
  }
  return null;
}
