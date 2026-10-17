import type { ConfigService } from "@nestjs/config";
import { TurnstileService } from "./turnstile.service.js";

const withSecret = (secret?: string) =>
  new TurnstileService({ get: () => secret } as unknown as ConfigService<
    never,
    true
  >);

describe("TurnstileService", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is skipped when no secret is configured (local dev)", async () => {
    await expect(
      withSecret(undefined).verify(undefined, "1.1.1.1"),
    ).resolves.toBeUndefined();
  });

  it("fails without a token", async () => {
    await expect(
      withSecret("s").verify(undefined, "1.1.1.1"),
    ).rejects.toMatchObject({
      response: { code: "TURNSTILE_FAILED" },
    });
  });

  it("passes when Cloudflare says success and fails otherwise", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: true })),
    );
    await expect(
      withSecret("s").verify("tok", "1.1.1.1"),
    ).resolves.toBeUndefined();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false })),
    );
    await expect(
      withSecret("s").verify("tok", "1.1.1.1"),
    ).rejects.toMatchObject({
      response: { code: "TURNSTILE_FAILED" },
    });
  });
});
