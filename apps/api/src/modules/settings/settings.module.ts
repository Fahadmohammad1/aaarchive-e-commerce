import { Global, Module } from "@nestjs/common";
import { MediaModule } from "../media/media.module.js";
import { AdminSettingsController } from "./admin-settings.controller.js";
import { SettingsController } from "./settings.controller.js";
import { SettingsService } from "./settings.service.js";

/** Global: checkout, cart and catalog modules all read settings. */
@Global()
@Module({
  imports: [MediaModule],
  controllers: [SettingsController, AdminSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
