import { Module } from "@nestjs/common";
import { CartModule } from "../cart/cart.module.js";
import { AdminCouponsController } from "./admin-coupons.controller.js";
import { CouponsController } from "./coupons.controller.js";
import { CouponsService } from "./coupons.service.js";
import { CouponsExportService } from "./coupons-export.service.js";

@Module({
  imports: [CartModule],
  controllers: [CouponsController, AdminCouponsController],
  providers: [CouponsService, CouponsExportService],
  exports: [CouponsService],
})
export class CouponsModule {}
