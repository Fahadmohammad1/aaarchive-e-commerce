import { Controller, Get } from "@nestjs/common";
import { Public } from "../../common/auth/auth.decorators.js";
import { DeliveryZonesService } from "./delivery-zones.service.js";

/** GET /delivery-zones: active zones with charge and estimate (PRD §5.8). */
@Public()
@Controller("delivery-zones")
export class DeliveryZonesController {
  constructor(private readonly zones: DeliveryZonesService) {}

  @Get()
  list() {
    return this.zones.listActive();
  }
}
