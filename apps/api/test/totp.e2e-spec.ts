import type { INestApplication } from "@nestjs/common";
import { generate } from "otplib";
import request from "supertest";
import type { App } from "supertest/types.js";
import { createApp, createUser, ORIGIN, TEST_DB } from "./auth-helpers.js";

// Two-factor sign-in (rules.md §8.2): setup, two-step login, one use per
// code, backup codes, and the challenge token never works as an access token.

const PASSWORD = "marigold kantha 1971";

describe.skipIf(!TEST_DB)("two-factor sign-in (e2e, real database)", () => {
  let app: INestApplication<App>;
  let owner: Awaited<ReturnType<typeof createUser>>;
  const post = (path: string, token?: string) => {
    const r = request(app.getHttpServer())
      .post(`/api/v1${path}`)
      .set("Origin", ORIGIN);
    return token ? r.set("Authorization", `Bearer ${token}`) : r;
  };
  const get = (path: string, token: string) =>
    request(app.getHttpServer())
      .get(`/api/v1${path}`)
      .set("Origin", ORIGIN)
      .set("Authorization", `Bearer ${token}`);

  beforeAll(async () => {
    app = await createApp();
    owner = await createUser(app, "OWNER", PASSWORD, "totp.aaarchive.test");
  });
  afterAll(async () => {
    await owner.prisma.user.deleteMany({ where: { id: owner.id } });
    await app.close();
  });

  it("turns on, signs in with a code, refuses reuse, accepts a backup code once", async () => {
    const first = await post("/auth/login").send({
      email: owner.email,
      password: PASSWORD,
    });
    const token = first.body.accessToken as string;
    expect((await get("/auth/totp", token)).body).toEqual({
      enabled: false,
      backupCodesLeft: 0,
    });

    const setup = await post("/auth/totp/setup", token);
    expect(setup.body.uri).toMatch(/^otpauth:\/\/totp\//);
    const secret = setup.body.secret as string;
    expect(
      (await post("/auth/totp/enable", token).send({ code: "000000" })).body
        .code,
    ).toBe("INVALID_TOTP_CODE");
    const enabled = await post("/auth/totp/enable", token).send({
      code: await generate({ secret }),
    });
    expect(enabled.status).toBe(200);
    const backup = enabled.body.backupCodes as string[];
    expect(backup).toHaveLength(10);

    const stored = await owner.prisma.user.findUniqueOrThrow({
      where: { id: owner.id },
    });
    expect(stored.totpSecret).not.toContain(secret);
    expect(stored.totpBackupCodes).not.toContain(backup[0]);

    // Step 1: password → challenge, no session cookie.
    const step1 = await post("/auth/login").send({
      email: owner.email,
      password: PASSWORD,
    });
    expect(step1.body).toMatchObject({ mfaRequired: true });
    expect(step1.headers["set-cookie"]).toBeUndefined();
    expect((await get("/auth/me", step1.body.mfaToken)).status).toBe(401);

    // The code used to enable cannot be reused within its window.
    const used = await post("/auth/login/totp").send({
      mfaToken: step1.body.mfaToken,
      code: await generate({ secret }),
    });
    expect(used.body.code).toBe("INVALID_TOTP_CODE");

    // A backup code works once.
    const viaBackup = await post("/auth/login/totp").send({
      mfaToken: step1.body.mfaToken,
      code: backup[0]?.toLowerCase(),
    });
    expect(viaBackup.status).toBe(200);
    expect(viaBackup.body.accessToken).toBeDefined();
    const again = await post("/auth/login/totp").send({
      mfaToken: step1.body.mfaToken,
      code: backup[0],
    });
    expect(again.body.code).toBe("INVALID_TOTP_CODE");
    expect(
      (await get("/auth/totp", viaBackup.body.accessToken)).body
        .backupCodesLeft,
    ).toBe(9);

    // Turning off needs the password and a code.
    const off = await post(
      "/auth/totp/disable",
      viaBackup.body.accessToken,
    ).send({
      password: PASSWORD,
      code: backup[1],
    });
    expect(off.status).toBe(204);
    const plain = await post("/auth/login").send({
      email: owner.email,
      password: PASSWORD,
    });
    expect(plain.body.accessToken).toBeDefined();
  });

  it("rejects a forged or expired challenge", async () => {
    const res = await post("/auth/login/totp").send({
      mfaToken: "not.a.jwt",
      code: "123456",
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("MFA_EXPIRED");
  });
});
