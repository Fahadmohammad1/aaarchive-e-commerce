// Must load first so Sentry can instrument the modules that follow.
import "./instrument.js";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as helmetModule from "helmet";
import { AppModule } from "./app.module.js";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter.js";
import type { Env } from "./config/env.schema.js";

// helmet ships ESM and CommonJS types. The Vercel build reads the CommonJS ones,
// where the function sits one `.default` deeper (architecture §8.1), so pick it
// at runtime: the same function either way.
const helmetExport: unknown = helmetModule.default;
const helmet = (
  typeof helmetExport === "function"
    ? helmetExport
    : (helmetExport as { default: unknown }).default
) as () => (req: unknown, res: unknown, next: () => void) => void;

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  const config = app.get(ConfigService<Env, true>);

  app.setGlobalPrefix("api/v1");
  // Proxies in front of the API (web server, CDN): req.ip must be the visitor
  // for rate limits and logs. 0 in local dev.
  app.set("trust proxy", config.get("TRUST_PROXY", { infer: true }));
  // Small JSON bodies only. Image uploads (multipart, ≤ 8 MB) are handled by
  // the media route with its own limit.
  app.useBodyParser("json", { limit: "100kb" });
  app.useBodyParser("urlencoded", { limit: "100kb", extended: false });
  app.use(helmet());
  app.enableCors({
    origin: config.get("FRONTEND_ORIGIN", { infer: true }),
    credentials: true,
    // Lets the web read the export's file name (docs/architecture.md §4.8).
    exposedHeaders: ["Content-Disposition"],
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  // The OpenAPI document is the contract the frontend's Zod schemas mirror.
  if (config.get("NODE_ENV", { infer: true }) !== "production") {
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle("Aaarchive API").setVersion("1").build(),
    );
    SwaggerModule.setup("api/docs", app, doc);
  }

  await app.listen(config.get("PORT", { infer: true }));
}
// Not awaited at the top level: Vercel's NestJS runtime imports this file and
// takes over `listen`, so a top-level await would never let the import finish
// (architecture §8.1). A failed start still exits with an error.
bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
