import {
  accountOrderListQuerySchema,
  addressInputSchema,
  claimOrderSchema,
  customerChangePasswordSchema,
  type ProfileUpdateInput,
  profileUpdateSchema,
} from "@aaarchive/shared/account";
import { orderNumberSchema } from "@aaarchive/shared/checkout";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import type { z } from "zod";
import { CurrentUser, Roles } from "../../common/auth/auth.decorators.js";
import type { RequestUser } from "../../common/auth/request-user.js";
import { SameOriginGuard } from "../../common/auth/same-origin.guard.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { Throttle } from "../../common/throttle/throttle.decorator.js";
import type { Env } from "../../config/env.schema.js";
import { AuthService } from "../auth/auth.service.js";
import { AccountService } from "./account.service.js";
import { AccountAuthService } from "./account-auth.service.js";
import { clearCustomerSession, setCustomerSession } from "./account-cookies.js";
import { AddressesService } from "./addresses.service.js";

const FIFTEEN_MINUTES = 15 * 60_000;
const HOUR = 3_600_000;

/** The signed-in customer's own data (PRD §5.10). CUSTOMER role only. */
@Controller("account")
@Roles("CUSTOMER")
@UseGuards(SameOriginGuard)
export class AccountController {
  private readonly production: boolean;

  constructor(
    private readonly account: AccountService,
    private readonly accounts: AccountAuthService,
    private readonly addresses: AddressesService,
    private readonly auth: AuthService,
    config: ConfigService<Env, true>,
  ) {
    this.production = config.get("NODE_ENV", { infer: true }) === "production";
  }

  @Get("me")
  me(@CurrentUser() user: RequestUser) {
    return this.account.profile(user.id);
  }

  @Patch("me")
  updateMe(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(profileUpdateSchema)) body: ProfileUpdateInput,
  ) {
    return this.account.updateProfile(user.id, body);
  }

  /** Ends every other session and starts a new one here. */
  @Post("change-password")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: FIFTEEN_MINUTES } })
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(customerChangePasswordSchema))
    body: z.output<typeof customerChangePasswordSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { session, refresh } = await this.auth.changePassword(
      user,
      body,
      req.header("user-agent"),
    );
    setCustomerSession(res, refresh, this.production);
    return session;
  }

  @Post("logout-all")
  @HttpCode(204)
  async logoutAll(
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logoutEverywhere(user.id);
    clearCustomerSession(res, this.production);
  }

  @Post("verify-email/resend")
  @HttpCode(204)
  @Throttle({ default: { limit: 3, ttl: HOUR } })
  async resendVerification(@CurrentUser() user: RequestUser) {
    await this.accounts.sendVerification(user.id);
  }

  @Get("orders")
  orders(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(accountOrderListQuerySchema))
    query: z.output<typeof accountOrderListQuerySchema>,
  ) {
    return this.account.orders(user.id, query.page, query.limit);
  }

  /** Links a guest order: phone + order number, like tracking. */
  @Post("orders/claim")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: FIFTEEN_MINUTES } })
  claim(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(claimOrderSchema))
    body: z.output<typeof claimOrderSchema>,
  ) {
    return this.account.claim(user.id, body);
  }

  @Get("orders/:orderNumber")
  order(
    @CurrentUser() user: RequestUser,
    @Param("orderNumber", new ZodValidationPipe(orderNumberSchema))
    orderNumber: string,
  ) {
    return this.account.order(user.id, orderNumber);
  }

  @Get("addresses")
  listAddresses(@CurrentUser() user: RequestUser) {
    return this.addresses.list(user.id);
  }

  @Post("addresses")
  createAddress(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(addressInputSchema))
    body: z.output<typeof addressInputSchema>,
  ) {
    return this.addresses.create(user.id, body);
  }

  @Put("addresses/:id")
  updateAddress(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(addressInputSchema))
    body: z.output<typeof addressInputSchema>,
  ) {
    return this.addresses.update(user.id, id, body);
  }

  @Delete("addresses/:id")
  @HttpCode(204)
  async removeAddress(
    @CurrentUser() user: RequestUser,
    @Param("id") id: string,
  ) {
    await this.addresses.remove(user.id, id);
  }
}
