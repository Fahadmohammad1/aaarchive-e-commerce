import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import { createApp, createUser, ORIGIN, TEST_DB } from "./auth-helpers.js";

const PASSWORD = "marigold kantha 1971";

describe.skipIf(!TEST_DB)("login lockout (e2e, real database)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it("locks the account after 5 failures, even for the right password", async () => {
    const user = await createUser(app, "STAFF", PASSWORD);
    const attempt = (password: string) =>
      request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .set("Origin", ORIGIN)
        .send({ email: user.email, password });

    for (let i = 0; i < 5; i++) {
      expect((await attempt("wrong password!")).status).toBe(401);
    }
    const right = await attempt(PASSWORD);
    expect(right.status).toBe(401);
    expect(right.body.code).toBe("INVALID_CREDENTIALS");

    const row = await user.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(row.lockedUntil?.getTime()).toBeGreaterThan(Date.now());
    await user.prisma.user.delete({ where: { id: user.id } });
  });
});
