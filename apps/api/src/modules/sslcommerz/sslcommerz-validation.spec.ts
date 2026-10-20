import { describe, expect, it } from "vitest";
import { judgeValidation, paidValIdFrom } from "./sslcommerz-validation.js";

const expected = { tranId: "pay_1", amount: 1250 };
const valid = {
  status: "VALID",
  tran_id: "pay_1",
  amount: "1250.00",
  currency_type: "BDT",
  risk_level: "0",
};

describe("judgeValidation", () => {
  it("accepts a valid payment of exactly the order total", () => {
    expect(judgeValidation(valid, expected)).toEqual({ outcome: "paid" });
    expect(
      judgeValidation({ ...valid, status: "VALIDATED" }, expected),
    ).toEqual({ outcome: "paid" });
  });

  it("refuses failed, foreign, short or other-currency payments", () => {
    for (const answer of [
      { ...valid, status: "INVALID_TRANSACTION" },
      { ...valid, status: undefined },
      { ...valid, tran_id: "pay_2" },
      { ...valid, amount: "1249.99" },
      { ...valid, amount: "12500.00" },
      { ...valid, amount: "not a number" },
      { ...valid, currency_type: "USD" },
    ]) {
      expect(judgeValidation(answer, expected).outcome).toBe("invalid");
    }
  });

  it("holds payments SSLCommerz marks as risky for staff", () => {
    expect(judgeValidation({ ...valid, risk_level: "1" }, expected)).toEqual({
      outcome: "risky",
    });
  });
});

describe("paidValIdFrom", () => {
  it("finds a paid transaction among the attempts", () => {
    expect(
      paidValIdFrom({
        element: [
          { status: "FAILED", val_id: "a" },
          { status: "VALID", val_id: "b" },
        ],
      }),
    ).toBe("b");
    expect(
      paidValIdFrom({ element: [{ status: "CANCELLED", val_id: "a" }] }),
    ).toBeNull();
    expect(paidValIdFrom({})).toBeNull();
  });
});
