import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
} from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { JwtAuthGuard } from "./common/auth/jwt-auth.guard.js";
import { RolesGuard } from "./common/auth/roles.guard.js";
import { ExportModule } from "./common/export/export.module.js";
import { ProxySecretMiddleware } from "./common/security/proxy-secret.middleware.js";
import { ThrottleGuard } from "./common/throttle/throttle.guard.js";
import { validateEnv } from "./config/env.schema.js";
import { HealthModule } from "./health/health.module.js";
import { AccountModule } from "./modules/account/account.module.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { CartModule } from "./modules/cart/cart.module.js";
import { CategoriesModule } from "./modules/categories/categories.module.js";
import { CollectionsModule } from "./modules/collections/collections.module.js";
import { ColorsModule } from "./modules/colors/colors.module.js";
import { ContentModule } from "./modules/content/content.module.js";
import { CouponsModule } from "./modules/coupons/coupons.module.js";
import { CustomersModule } from "./modules/customers/customers.module.js";
import { DeliveryZonesModule } from "./modules/delivery-zones/delivery-zones.module.js";
import { FeedsModule } from "./modules/feeds/feeds.module.js";
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
import { SslcommerzModule } from "./modules/sslcommerz/sslcommerz.module.js";
import { UsersModule } from "./modules/users/users.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    RevalidationModule,
    ExportModule,
    SettingsModule,
    MailModule,
    SslcommerzModule,
    AuthModule,
    AccountModule,
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
    FeedsModule,
  ],
  // Order matters: rate limit → authentication → role. Every route is
  // OWNER/STAFF-only unless it says @Public() or @Roles(...) (rules.md §8.3).
  providers: [
    // Global per-IP rate limit (THROTTLE_LIMIT / THROTTLE_TTL_SECONDS); routes
    // like login and checkout add stricter @Throttle() limits (rules.md §8).
    { provide: APP_GUARD, useClass: ThrottleGuard },
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
