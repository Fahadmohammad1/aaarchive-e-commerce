import { expect, test } from "bun:test";
import {
  changePasswordSchema,
  loginSchema,
  newPasswordSchema,
} from "./auth.js";

test("login normalises the email and rejects unknown fields", () => {
  expect(
    loginSchema.parse({ email: "  Owner@Aaarchive.COM ", password: "x" }).email,
  ).toBe("owner@aaarchive.com");
  expect(
    loginSchema.safeParse({ email: "a@b.co", password: "x", role: "OWNER" })
      .success,
  ).toBe(false);
  expect(
    loginSchema.safeParse({ email: "not-an-email", password: "x" }).success,
  ).toBe(false);
});

test("new passwords need 10–128 characters", () => {
  expect(newPasswordSchema.safeParse("short").success).toBe(false);
  expect(newPasswordSchema.safeParse("long enough pass").success).toBe(true);
  expect(newPasswordSchema.safeParse("x".repeat(129)).success).toBe(false);
});

test("change password must actually change it", () => {
  expect(
    changePasswordSchema.safeParse({
      currentPassword: "same password 1",
      newPassword: "same password 1",
    }).success,
  ).toBe(false);
});
