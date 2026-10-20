import { describe, expect, it } from "vitest";
import { checkGoogleClaims, decodeJwtPayload } from "./google-oauth.service.js";

const now = 1_800_000_000;
const claims = {
  iss: "https://accounts.google.com",
  aud: "client-1",
  exp: now + 300,
  sub: "1234567890",
  email: "Rafi@Gmail.com",
  email_verified: true,
  name: "Rafi Ahmed",
};

describe("checkGoogleClaims", () => {
  it("accepts a fresh token for our client with a verified email", () => {
    expect(checkGoogleClaims(claims, "client-1", now)).toEqual({
      sub: "1234567890",
      email: "rafi@gmail.com",
      name: "Rafi Ahmed",
    });
  });

  it("refuses other issuers, other clients, expired tokens and unverified emails", () => {
    for (const bad of [
      { ...claims, iss: "https://evil.example" },
      { ...claims, aud: "someone-else" },
      { ...claims, exp: now },
      { ...claims, email_verified: false },
      { ...claims, email_verified: "true" },
      { ...claims, sub: "" },
      { ...claims, email: undefined },
    ]) {
      expect(checkGoogleClaims(bad, "client-1", now)).toBeNull();
    }
  });

  it("falls back to the email name when Google sends no usable name", () => {
    expect(
      checkGoogleClaims({ ...claims, name: undefined }, "client-1", now)?.name,
    ).toBe("Rafi");
  });
});

describe("decodeJwtPayload", () => {
  it("reads the middle part and refuses junk", () => {
    const payload = Buffer.from(JSON.stringify({ sub: "x" })).toString(
      "base64url",
    );
    expect(decodeJwtPayload(`h.${payload}.s`)).toEqual({ sub: "x" });
    expect(decodeJwtPayload("not-a-jwt")).toBeNull();
    expect(decodeJwtPayload("h.!!!.s")).toBeNull();
  });
});
