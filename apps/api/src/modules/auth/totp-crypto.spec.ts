import {
  decryptSecret,
  deriveKey,
  encryptSecret,
  hashBackupCode,
  newBackupCode,
} from "./totp-crypto.js";

describe("TOTP secret encryption", () => {
  it("round-trips and fails with another key or a tampered value", () => {
    const key = deriveKey("k".repeat(40));
    const stored = encryptSecret("JBSWY3DPEHPK3PXP", key);
    expect(stored).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptSecret(stored, key)).toBe("JBSWY3DPEHPK3PXP");
    expect(() => decryptSecret(stored, deriveKey("x".repeat(40)))).toThrow();
    const parts = stored.split(":");
    parts[3] = Buffer.from("tampered").toString("base64");
    expect(() => decryptSecret(parts.join(":"), key)).toThrow();
  });

  it("backup codes: readable format; hash ignores dash and case", () => {
    expect(newBackupCode()).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(hashBackupCode("ab12-cd34")).toBe(hashBackupCode("AB12CD34"));
  });
});
