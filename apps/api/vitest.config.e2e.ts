import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: "./",
    include: ["**/*.e2e-spec.ts"],
    // A port nothing listens on: e2e tests must not need a real database.
    env: {
      DATABASE_URL: "postgresql://test:test@127.0.0.1:1/test",
      JWT_ACCESS_SECRET: "e2e-only-secret-not-used-anywhere-else-0123",
    },
  },
});
