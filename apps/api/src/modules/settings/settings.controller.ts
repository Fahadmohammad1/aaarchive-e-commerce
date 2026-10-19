import { Controller, Get } from "@nestjs/common";
import { Public } from "../../common/auth/auth.decorators.js";
import { SettingsService } from "./settings.service.js";

/** GET /settings/public: payment numbers, delivery and quantity rules for checkout. */
@Public()
@Controller("settings")
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get("public")
  publicSettings() {
    return this.settings.publicSettings();
  }
}
