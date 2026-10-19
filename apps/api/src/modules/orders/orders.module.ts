import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { CartModule } from "../cart/cart.module.js";
import { CouponsModule } from "../coupons/coupons.module.js";
import { DeliveryZonesModule } from "../delivery-zones/delivery-zones.module.js";
import { OrdersController } from "./orders.controller.js";
import { OrdersService } from "./orders.service.js";

@Module({
  imports: [AuthModule, CartModule, CouponsModule, DeliveryZonesModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
