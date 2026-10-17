import { validateEnv } from "./env.schema.js";

const base = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  JWT_ACCESS_SECRET: "j".repeat(32),
};

describe("validateEnv", () => {
  it("treats empty values as unset", () => {
    const env = validateEnv({ ...base, REVALIDATE_SECRET: "", PORT: "" });
    expect(env.REVALIDATE_SECRET).toBeUndefined();
    expect(env.PORT).toBe(4000);
  });

  it("still rejects a secret that is set but too short", () => {
    expect(() => validateEnv({ ...base, REVALIDATE_SECRET: "short" })).toThrow(
      /REVALIDATE_SECRET/,
    );
  });

  it("requires DATABASE_URL", () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it("refuses to start in production without the secrets", () => {
    expect(() => validateEnv({ ...base, NODE_ENV: "production" })).toThrow(
      /API_PROXY_SECRET[\s\S]*REVALIDATE_SECRET|REVALIDATE_SECRET[\s\S]*API_PROXY_SECRET/,
    );
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: "production",
        API_PROXY_SECRET: "s".repeat(32),
        REVALIDATE_SECRET: "r".repeat(16),
        TURNSTILE_SECRET_KEY: "t",
      }),
    ).not.toThrow();
  });
});
