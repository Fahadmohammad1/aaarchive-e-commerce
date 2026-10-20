import { Module } from "@nestjs/common";
import { AccountModule } from "../account/account.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { CartModule } from "../cart/cart.module.js";
import { CouponsModule } from "../coupons/coupons.module.js";
import { DeliveryZonesModule } from "../delivery-zones/delivery-zones.module.js";
import { AdminOrdersController } from "./admin-orders.controller.js";
import { AdminOrdersService } from "./admin-orders.service.js";
import { OrdersController } from "./orders.controller.js";
import { OrdersService } from "./orders.service.js";
import { OrdersExportService } from "./orders-export.service.js";

@Module({
  imports: [
    AuthModule,
    AccountModule,
    CartModule,
    CouponsModule,
    DeliveryZonesModule,
  ],
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, AdminOrdersService, OrdersExportService],
  exports: [OrdersService, AdminOrdersService],
})
export class OrdersModule {}
