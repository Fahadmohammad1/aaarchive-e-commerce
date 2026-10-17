import { randomUUID } from "node:crypto";
import { Controller, Get, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { hash } from "@node-rs/argon2";
import type { App } from "supertest/types.js";

/**
 * Auth e2e tests need a real, migrated Postgres. Set TEST_DATABASE_URL
 * (CI does; locally use `bunx prisma dev`). Without it the suites are skipped.
 */
export const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB;

export const ORIGIN = "http://localhost:3000";

/** A route with no auth decorators: OWNER/STAFF only by default. */
@Controller("__probe")
class ProbeController {
  @Get()
  ok() {
    return { ok: true };
  }
}

export async function createApp(): Promise<INestApplication<App>> {
  const { AppModule } = await import("../src/app.module.js");
  const { AllExceptionsFilter } = await import(
    "../src/common/filters/all-exceptions.filter.js"
  );
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [ProbeController],
  }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  return app;
}

export async function createUser(
  app: INestApplication<App>,
  role: "OWNER" | "STAFF" | "CUSTOMER",
  password: string,
) {
  const { PrismaService } = await import("../src/prisma/prisma.service.js");
  const prisma = app.get(PrismaService);
  const email = `test-${randomUUID()}@aaarchive.test`;
  const user = await prisma.user.create({
    data: {
      name: `Test ${role}`,
      email,
      role,
      passwordHash: await hash(password),
    },
  });
  return { ...user, email, password, prisma };
}

export function refreshCookieFrom(setCookie: string[] | string | undefined) {
  const list = Array.isArray(setCookie)
    ? setCookie
    : setCookie
      ? [setCookie]
      : [];
  return list.find((c) => c.startsWith("aar_rt="));
}

/** "aar_rt=…" (name=value only), for sending back in a Cookie header. */
export function refreshCookiePair(
  setCookie: string[] | string | undefined,
): string {
  const cookie = refreshCookieFrom(setCookie);
  if (!cookie) throw new Error("No refresh cookie was set");
  return cookie.split(";")[0] ?? cookie;
}
