import { describe, expect, it } from "vitest";
import { safeCustomerNext } from "./account-cookies.js";

describe("safeCustomerNext", () => {
  it("keeps our own account and checkout pages", () => {
    expect(safeCustomerNext("/account/orders")).toBe("/account/orders");
    expect(safeCustomerNext("/checkout")).toBe("/checkout");
    expect(safeCustomerNext("/account/orders?page=2")).toBe(
      "/account/orders?page=2",
    );
  });

  it("refuses anything that could leave the site or loop", () => {
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/admin",
      "/account/login",
      "/account/../admin",
      "javascript:alert(1)",
      undefined,
      42,
    ]) {
      expect(safeCustomerNext(bad)).toBe("/account");
    }
  });
});
