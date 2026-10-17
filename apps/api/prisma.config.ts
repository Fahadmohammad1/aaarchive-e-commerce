import "dotenv/config";
import { defineConfig } from "prisma/config";

// The CLI (migrate, studio) needs a direct connection; the app itself uses the
// pooled DATABASE_URL through the pg adapter (see src/prisma/prisma.service.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
