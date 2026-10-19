import { Module } from "@nestjs/common";
import { AdminDeliveryZonesController } from "./admin-delivery-zones.controller.js";
import { DeliveryZonesController } from "./delivery-zones.controller.js";
import { DeliveryZonesService } from "./delivery-zones.service.js";

@Module({
  controllers: [DeliveryZonesController, AdminDeliveryZonesController],
  providers: [DeliveryZonesService],
  exports: [DeliveryZonesService],
})
export class DeliveryZonesModule {}
