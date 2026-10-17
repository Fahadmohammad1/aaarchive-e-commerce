import { checkNewPassword } from "./password-policy.js";

describe("checkNewPassword", () => {
  it.each([
    ["short", "PASSWORD_TOO_SHORT"],
    ["1234567890", "PASSWORD_TOO_COMMON"],
    ["QwertyUiop", "PASSWORD_TOO_COMMON"],
    ["aaaaaaaaaaaa", "PASSWORD_TOO_COMMON"],
    ["aaarchive2026", "PASSWORD_TOO_COMMON"],
  ])("rejects %s", (password, problem) => {
    expect(checkNewPassword(password)).toBe(problem);
  });

  it("rejects a password containing the email name", () => {
    expect(checkNewPassword("fahad-secret-99", "fahad@aaarchive.com")).toBe(
      "PASSWORD_CONTAINS_EMAIL",
    );
  });

  it("accepts a reasonable passphrase", () => {
    expect(
      checkNewPassword("marigold kantha 1971", "owner@aaarchive.com"),
    ).toBeNull();
  });
});
