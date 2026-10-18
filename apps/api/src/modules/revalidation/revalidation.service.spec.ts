import type { ConfigService } from "@nestjs/config";
import { RevalidationService } from "./revalidation.service.js";

const service = (env: Record<string, string | undefined>) =>
  new RevalidationService({
    get: (key: string) => env[key],
  } as unknown as ConfigService<never, true>);

const configured = {
  FRONTEND_REVALIDATE_URL: "http://web.test/api/revalidate",
  REVALIDATE_SECRET: "secret-secret-secret",
};

describe("RevalidationService", () => {
  afterEach(() => vi.restoreAllMocks());

  it("does nothing without a URL (local dev)", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await service({}).revalidate(["products"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the unique tags with the secret header", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    await service(configured).revalidate(["categories", "home", "categories"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(configured.FRONTEND_REVALIDATE_URL);
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("x-revalidate-secret")).toBe(
      configured.REVALIDATE_SECRET,
    );
    expect(JSON.parse(String(init?.body))).toEqual({
      tags: ["categories", "home"],
    });
  });

  it("never throws when the website is unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("down"));
    await expect(
      service(configured).revalidate(["products"]),
    ).resolves.toBeUndefined();
  });
});
