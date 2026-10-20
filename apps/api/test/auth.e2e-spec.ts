import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import type { App } from "supertest/types.js";
import {
  createApp,
  createUser,
  ORIGIN,
  refreshCookieFrom,
  refreshCookiePair,
  TEST_DB,
} from "./auth-helpers.js";

const PASSWORD = "marigold kantha 1971";

describe.skipIf(!TEST_DB)("auth (e2e, real database)", () => {
  let app: INestApplication<App>;
  let owner: Awaited<ReturnType<typeof createUser>>;

  const post = (path: string) =>
    request(app.getHttpServer()).post(`/api/v1${path}`).set("Origin", ORIGIN);
  const login = (email: string, password: string) =>
    post("/auth/login").send({ email, password });

  beforeAll(async () => {
    app = await createApp();
    owner = await createUser(app, "OWNER", PASSWORD);
  });

  afterAll(async () => {
    await owner.prisma.user.deleteMany({
      where: { email: { endsWith: "@aaarchive.test" } },
    });
    await app.close();
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const wrong = await login(owner.email, "not the password");
    const unknown = await login("nobody@aaarchive.test", "not the password");
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body).toEqual(unknown.body);
    expect(wrong.body.code).toBe("INVALID_CREDENTIALS");
  });

  it("refuses requests from another site (CSRF)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .set("Origin", "https://evil.example")
      .send({ email: owner.email, password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("ORIGIN_NOT_ALLOWED");
  });

  it("signs in, sets a locked-down refresh cookie, and rotates it", async () => {
    const res = await login(owner.email.toUpperCase(), PASSWORD);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: owner.email, role: "OWNER" });
    expect(res.body).not.toHaveProperty("user.passwordHash");

    const cookie = refreshCookieFrom(res.headers["set-cookie"]);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
    expect(cookie).toMatch(/SameSite=Lax/i);

    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${res.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(owner.email);

    const sent = refreshCookiePair(res.headers["set-cookie"]);
    const refreshed = await post("/auth/refresh").set("Cookie", sent);
    expect(refreshed.status).toBe(200);
    expect(refreshCookiePair(refreshed.headers["set-cookie"])).not.toBe(sent);
  });

  it("revokes the whole session when an old refresh token is replayed (theft)", async () => {
    const res = await login(owner.email, PASSWORD);
    const first = refreshCookiePair(res.headers["set-cookie"]);
    const rotated = await post("/auth/refresh").set("Cookie", first);
    expect(rotated.status).toBe(200);

    // Pretend the old token is replayed long after it was rotated.
    await owner.prisma.refreshToken.updateMany({
      where: { userId: owner.id, replacedAt: { not: null } },
      data: { replacedAt: new Date(Date.now() - 60_000) },
    });
    const replay = await post("/auth/refresh").set("Cookie", first);
    expect(replay.status).toBe(401);

    // The thief's replay also ended the legitimate session.
    const second = refreshCookiePair(rotated.headers["set-cookie"]);
    expect((await post("/auth/refresh").set("Cookie", second)).status).toBe(
      401,
    );
    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${rotated.body.accessToken}`);
    expect(me.status).toBe(401);
  });

  it("logout ends the session immediately, access token included", async () => {
    const res = await login(owner.email, PASSWORD);
    const cookie = refreshCookiePair(res.headers["set-cookie"]);
    expect((await post("/auth/logout").set("Cookie", cookie)).status).toBe(204);
    expect((await post("/auth/refresh").set("Cookie", cookie)).status).toBe(
      401,
    );
    const me = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${res.body.accessToken}`);
    expect(me.status).toBe(401);
  });

  it("protects routes by default: no token 401, customer 403, staff 200", async () => {
    const server = app.getHttpServer();
    expect((await request(server).get("/api/v1/__probe")).status).toBe(401);

    const customer = await createUser(app, "CUSTOMER", PASSWORD);
    // Customers cannot use the dashboard's sign-in at all (PRD §5.10)…
    expect((await login(customer.email, PASSWORD)).status).toBe(401);
    // …and a customer session from the shop's door is still refused here.
    const asCustomer = await post("/account/auth/login").send({
      email: customer.email,
      password: PASSWORD,
    });
    expect(asCustomer.status).toBe(200);
    const denied = await request(server)
      .get("/api/v1/__probe")
      .set("Authorization", `Bearer ${asCustomer.body.accessToken}`);
    expect(denied.status).toBe(403);

    const asOwner = await login(owner.email, PASSWORD);
    const allowed = await request(server)
      .get("/api/v1/__probe")
      .set("Authorization", `Bearer ${asOwner.body.accessToken}`);
    expect(allowed.status).toBe(200);
  });

  it("rejects a forged or tampered access token", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.");
    expect(res.status).toBe(401);
  });

  it("changing the password rejects weak ones and ends other sessions", async () => {
    const staff = await createUser(app, "STAFF", PASSWORD);
    const other = await login(staff.email, PASSWORD);
    const here = await login(staff.email, PASSWORD);
    const auth = { Authorization: `Bearer ${here.body.accessToken}` };

    const weak = await post("/auth/change-password")
      .set(auth)
      .send({ currentPassword: PASSWORD, newPassword: "1234567890" });
    expect(weak.status).toBe(400);
    expect(weak.body.code).toBe("PASSWORD_TOO_COMMON");

    const changed = await post("/auth/change-password").set(auth).send({
      currentPassword: PASSWORD,
      newPassword: "a much better passphrase 7",
    });
    expect(changed.status).toBe(200);

    const server = app.getHttpServer();
    const oldSession = await request(server)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${other.body.accessToken}`);
    expect(oldSession.status).toBe(401);
    const newSession = await request(server)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${changed.body.accessToken}`);
    expect(newSession.status).toBe(200);
  });
});
