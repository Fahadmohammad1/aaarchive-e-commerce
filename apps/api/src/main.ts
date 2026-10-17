import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module.js";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter.js";
import type { Env } from "./config/env.schema.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<Env, true>);

  app.setGlobalPrefix("api/v1");
  app.use(helmet());
  app.enableCors({
    origin: config.get("FRONTEND_ORIGIN", { infer: true }),
    credentials: true,
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
await bootstrap();
