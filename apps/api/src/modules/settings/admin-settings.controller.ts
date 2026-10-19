import { courierSettingsSchema } from "@aaarchive/shared/settings";
import { Body, Controller, Get, Param, Put, UseGuards } from "@nestjs/common";
import type { z } from "zod";
import { Roles } from "../../common/auth/auth.decorators.js";
import { SameOriginGuard } from "../../common/auth/same-origin.guard.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { SettingsService } from "./settings.service.js";

/**
 * Settings (PRD §6.8). Owner only (rules.md §8.3: staff cannot reach
 * settings), except the courier list, which staff read when shipping.
 */
@Controller("admin/settings")
@UseGuards(SameOriginGuard)
export class AdminSettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @Roles("OWNER")
  all() {
    return this.settings.adminAll();
  }

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
    return this.settings.save("couriers", body);
  }

  /** Validated in the service with the schema of `:key`. */
  @Put(":key")
  @Roles("OWNER")
  save(@Param("key") key: string, @Body() body: { value?: unknown }) {
    return this.settings.save(key, body?.value);
  }
}
