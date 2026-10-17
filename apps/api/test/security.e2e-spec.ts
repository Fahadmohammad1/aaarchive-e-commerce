import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type { App } from "supertest/types.js";

// Env must be set before AppModule is imported: ConfigModule validates at import.
const SECRET = "x".repeat(40);
process.env.API_PROXY_SECRET = SECRET;
process.env.THROTTLE_LIMIT = "5";

describe("security baseline (e2e)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const { AppModule } = await import("../src/app.module.js");
    const { AllExceptionsFilter } = await import(
      "../src/common/filters/all-exceptions.filter.js"
    );
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("refuses requests that did not come through the web proxy", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/anything");
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
  });

  it("refuses a wrong secret", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/anything")
      .set("x-aaarchive-proxy", "y".repeat(40));
    expect(res.status).toBe(403);
  });

  it("lets proxied requests through (404 = reached the router)", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/anything")
      .set("x-aaarchive-proxy", SECRET);
    expect(res.status).toBe(404);
  });

  it("keeps /health open for uptime monitors", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/health");
    expect(res.status).toBe(200);
  });

  it("rate-limits a client that sends too many requests", async () => {
    const server = app.getHttpServer();
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) {
      statuses.push((await request(server).get("/api/v1/health")).status);
    }
    expect(statuses).toContain(429);
  });
});
