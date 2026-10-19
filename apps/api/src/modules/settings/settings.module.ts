import { Global, Module } from "@nestjs/common";
import { AdminSettingsController } from "./admin-settings.controller.js";
import { SettingsController } from "./settings.controller.js";
import { SettingsService } from "./settings.service.js";

/** Global: checkout, cart and catalog modules all read settings. */
@Global()
@Module({
  controllers: [SettingsController, AdminSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
