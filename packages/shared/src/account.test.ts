import { expect, test } from "bun:test";
import {
  accountTokenSchema,
  addressInputSchema,
  claimOrderSchema,
  profileUpdateSchema,
  registerSchema,
} from "./account.js";

test("register normalises the email and needs a 10+ character password", () => {
  const ok = registerSchema.parse({
    name: " Rafi ",
    email: " Rafi@Example.COM ",
    password: "long enough pass",
  });
  expect(ok.email).toBe("rafi@example.com");
  expect(ok.name).toBe("Rafi");
  expect(
    registerSchema.safeParse({
      name: "Rafi",
      email: "rafi@example.com",
      password: "short",
    }).success,
  ).toBe(false);
  // No role or other extra fields can be smuggled in.
  expect(
    registerSchema.safeParse({
      name: "Rafi",
      email: "rafi@example.com",
      password: "long enough pass",
      role: "OWNER",
    }).success,
  ).toBe(false);
});

test("profile phone is normalised, and an empty string removes it", () => {
  expect(profileUpdateSchema.parse({ phone: "+8801712345678" }).phone).toBe(
    "01712345678",
  );
  expect(profileUpdateSchema.parse({ phone: "" }).phone).toBeNull();
  expect(profileUpdateSchema.safeParse({ phone: "12345" }).success).toBe(false);
  expect(profileUpdateSchema.safeParse({}).success).toBe(false);
});

test("addresses use the checkout rules", () => {
  const valid = {
    name: "Rafi Ahmed",
    phone: "01712345678",
    zoneId: "zone_1",
    district: "Dhaka",
    area: "Mirpur",
    address: "House 1, Road 2",
  };
  expect(addressInputSchema.parse(valid).isDefault).toBe(false);
  expect(
    addressInputSchema.safeParse({ ...valid, district: "Atlantis" }).success,
  ).toBe(false);
  expect(addressInputSchema.safeParse({ ...valid, address: "x" }).success).toBe(
    false,
  );
});

test("claiming an order needs both the phone and the order number", () => {
  expect(
    claimOrderSchema.parse({ phone: "01712345678", orderNumber: "aar-24101" })
      .orderNumber,
  ).toBe("AAR-24101");
  expect(claimOrderSchema.safeParse({ phone: "01712345678" }).success).toBe(
    false,
  );
});

test("emailed tokens must look like our random tokens", () => {
  expect(accountTokenSchema.safeParse("a".repeat(43)).success).toBe(true);
  expect(accountTokenSchema.safeParse("short").success).toBe(false);
  expect(accountTokenSchema.safeParse(`${"a".repeat(40)}<>`).success).toBe(
    false,
  );
});
