import { Global, Module } from "@nestjs/common";
import { SettingsController } from "./settings.controller.js";
import { SettingsService } from "./settings.service.js";

/** Global: checkout, cart and catalog modules all read settings. */
@Global()
@Module({
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
