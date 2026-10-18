import type { Request } from "express";
import { hasProxySecret, isServerRender } from "./proxy-secret.middleware.js";

function req(method: string, headers: Record<string, string>): Request {
  return {
    method,
    header: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
}

const secret = Buffer.from("s3cret-value");

describe("proxy secret helpers", () => {
  it("checks the secret in constant time and refuses when none is configured", () => {
    expect(
      hasProxySecret(
        req("GET", { "x-aaarchive-proxy": "s3cret-value" }),
        secret,
      ),
    ).toBe(true);
    expect(
      hasProxySecret(
        req("GET", { "x-aaarchive-proxy": "s3cret-valuX" }),
        secret,
      ),
    ).toBe(false);
    expect(hasProxySecret(req("GET", {}), secret)).toBe(false);
    expect(hasProxySecret(req("GET", { "x-aaarchive-proxy": "" }), null)).toBe(
      false,
    );
  });

  it("treats only GET/HEAD with the secret and the server header as a page render", () => {
    const both = {
      "x-aaarchive-proxy": "s3cret-value",
      "x-aaarchive-ssr": "1",
    };
    expect(isServerRender(req("GET", both), secret)).toBe(true);
    expect(isServerRender(req("POST", both), secret)).toBe(false);
    expect(isServerRender(req("GET", { "x-aaarchive-ssr": "1" }), secret)).toBe(
      false,
    );
    // Local dev without a secret: never skip the rate limit.
    expect(isServerRender(req("GET", both), null)).toBe(false);
  });
});
