import { courierSettingsSchema } from "@aaarchive/shared/settings";
import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import type { z } from "zod";
import { Roles } from "../../common/auth/auth.decorators.js";
import { SameOriginGuard } from "../../common/auth/same-origin.guard.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { SettingsService } from "./settings.service.js";

/**
 * Settings edited in the dashboard. Phase 5 needs the courier list (picked
 * when shipping); the other settings screens arrive in Phase 6.
 */
@Controller("admin/settings")
@UseGuards(SameOriginGuard)
export class AdminSettingsController {
  constructor(private readonly settings: SettingsService) {}

  /** OWNER and STAFF: staff choose a courier when they ship. */
  @Get("couriers")
  couriers() {
    return this.settings.couriers();
  }

  @Put("couriers")
  @Roles("OWNER")
  saveCouriers(
    @Body(new ZodValidationPipe(courierSettingsSchema))
    body: z.output<typeof courierSettingsSchema>,
  ) {
    return this.settings.saveCouriers(body);
  }
}
