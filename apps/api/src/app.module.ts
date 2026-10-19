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
import { ExportModule } from "./common/export/export.module.js";
import {
  isServerRender,
  ProxySecretMiddleware,
} from "./common/security/proxy-secret.middleware.js";
import { type Env, validateEnv } from "./config/env.schema.js";
import { HealthModule } from "./health/health.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { CartModule } from "./modules/cart/cart.module.js";
import { CategoriesModule } from "./modules/categories/categories.module.js";
import { CollectionsModule } from "./modules/collections/collections.module.js";
import { ColorsModule } from "./modules/colors/colors.module.js";
import { ContentModule } from "./modules/content/content.module.js";
import { CouponsModule } from "./modules/coupons/coupons.module.js";
import { CustomersModule } from "./modules/customers/customers.module.js";
import { DeliveryZonesModule } from "./modules/delivery-zones/delivery-zones.module.js";
import { MailModule } from "./modules/mail/mail.module.js";
import { MediaModule } from "./modules/media/media.module.js";
import { OrdersModule } from "./modules/orders/orders.module.js";
import { PaymentsModule } from "./modules/payments/payments.module.js";
import { ProductsModule } from "./modules/products/products.module.js";
import { ReportsModule } from "./modules/reports/reports.module.js";
import { RevalidationModule } from "./modules/revalidation/revalidation.module.js";
import { SettingsModule } from "./modules/settings/settings.module.js";
import { SizeChartsModule } from "./modules/size-charts/size-charts.module.js";
import { SizesModule } from "./modules/sizes/sizes.module.js";
import { UsersModule } from "./modules/users/users.module.js";
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
      useFactory: (config: ConfigService<Env, true>) => {
        const value = config.get("API_PROXY_SECRET", { infer: true });
        const secret = value ? Buffer.from(value) : null;
        return {
          throttlers: [
            {
              ttl: config.get("THROTTLE_TTL_SECONDS", { infer: true }) * 1000,
              limit: config.get("THROTTLE_LIMIT", { infer: true }),
            },
          ],
          // Page renders all come from the web server's one IP: skip them
          // (secret + server header, GET only); visitors stay limited.
          skipIf: (context) =>
            isServerRender(context.switchToHttp().getRequest(), secret),
        };
      },
    }),
    PrismaModule,
    HealthModule,
    RevalidationModule,
    ExportModule,
    SettingsModule,
    MailModule,
    AuthModule,
    MediaModule,
    CategoriesModule,
    CollectionsModule,
    SizesModule,
    ColorsModule,
    SizeChartsModule,
    ProductsModule,
    DeliveryZonesModule,
    CartModule,
    CouponsModule,
    OrdersModule,
    PaymentsModule,
    CustomersModule,
    ReportsModule,
    ContentModule,
    UsersModule,
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
