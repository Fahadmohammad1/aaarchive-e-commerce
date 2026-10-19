import {
  deliveryZoneInputSchema,
  deliveryZoneUpdateSchema,
} from "@aaarchive/shared/delivery";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { z } from "zod";
import { Roles } from "../../common/auth/auth.decorators.js";
import { SameOriginGuard } from "../../common/auth/same-origin.guard.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { DeliveryZonesService } from "./delivery-zones.service.js";

/** Reads: OWNER/STAFF (global default). Writes: OWNER only (PRD §3). */
@Controller("admin/zones")
@UseGuards(SameOriginGuard)
export class AdminDeliveryZonesController {
  constructor(private readonly zones: DeliveryZonesService) {}

  /** A handful of zones: no paging needed. */
  @Get()
  list() {
    return this.zones.list();
  }

  @Post()
  @Roles("OWNER")
  create(
    @Body(new ZodValidationPipe(deliveryZoneInputSchema))
    body: z.output<typeof deliveryZoneInputSchema>,
  ) {
    return this.zones.create(body);
  }

  @Patch(":id")
  @Roles("OWNER")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(deliveryZoneUpdateSchema))
    body: z.output<typeof deliveryZoneUpdateSchema>,
  ) {
    return this.zones.update(id, body);
  }

  @Delete(":id")
  @Roles("OWNER")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.zones.remove(id);
  }
}
