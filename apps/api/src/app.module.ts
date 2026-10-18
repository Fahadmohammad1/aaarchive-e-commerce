import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
} from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import cookieParser from "cookie-parser";
import { JwtAuthGuard } from "./common/auth/jwt-auth.guard.js";
import { RolesGuard } from "./common/auth/roles.guard.js";
import { ProxySecretMiddleware } from "./common/security/proxy-secret.middleware.js";
import { type Env, validateEnv } from "./config/env.schema.js";
import { HealthModule } from "./health/health.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { CategoriesModule } from "./modules/categories/categories.module.js";
import { CollectionsModule } from "./modules/collections/collections.module.js";
import { ColorsModule } from "./modules/colors/colors.module.js";
import { MediaModule } from "./modules/media/media.module.js";
import { RevalidationModule } from "./modules/revalidation/revalidation.module.js";
import { SizesModule } from "./modules/sizes/sizes.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    // Global per-IP rate limit; routes like login and checkout add stricter
    // @Throttle() limits of their own (docs/rules.md §8).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => [
        {
          ttl: config.get("THROTTLE_TTL_SECONDS", { infer: true }) * 1000,
          limit: config.get("THROTTLE_LIMIT", { infer: true }),
        },
      ],
    }),
    PrismaModule,
    HealthModule,
    RevalidationModule,
    AuthModule,
    MediaModule,
    CategoriesModule,
    CollectionsModule,
    SizesModule,
    ColorsModule,
  ],
  // Order matters: rate limit → authentication → role. Every route is
  // OWNER/STAFF-only unless it says @Public() or @Roles(...) (rules.md §8.3).
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(cookieParser()).forRoutes("*path");
    consumer
      .apply(ProxySecretMiddleware)
      .exclude({ path: "health", method: RequestMethod.GET })
      .forRoutes("*path");
  }
}
