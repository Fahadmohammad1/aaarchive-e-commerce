import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { AccountController } from "./account.controller.js";
import { AccountService } from "./account.service.js";
import { AccountAuthController } from "./account-auth.controller.js";
import { AccountAuthService } from "./account-auth.service.js";
import { AccountTokensService } from "./account-tokens.service.js";
import { AddressesService } from "./addresses.service.js";
import { GoogleOAuthService } from "./google-oauth.service.js";

/** Optional customer accounts (PRD §5.10). Guest checkout does not need them. */
@Module({
  imports: [AuthModule],
  controllers: [AccountAuthController, AccountController],
  providers: [
    AccountService,
    AccountAuthService,
    AccountTokensService,
    AddressesService,
    GoogleOAuthService,
  ],
  exports: [AddressesService, GoogleOAuthService],
})
export class AccountModule {}
