import {
  type ChangePasswordInput,
  changePasswordSchema,
  type LoginInput,
  loginSchema,
  ROLES,
  totpDisableSchema,
  totpEnableSchema,
  totpLoginSchema,
} from "@aaarchive/shared/auth";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import type { z } from "zod";
import {
  CurrentUser,
  Public,
  Roles,
} from "../../common/auth/auth.decorators.js";
import type { RequestUser } from "../../common/auth/request-user.js";
import { SameOriginGuard } from "../../common/auth/same-origin.guard.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import type { Env } from "../../config/env.schema.js";
import { REFRESH_COOKIE, refreshCookieOptions } from "./auth.constants.js";
import { AuthService } from "./auth.service.js";
import type { IssuedRefresh } from "./token.service.js";
import { TotpService } from "./totp.service.js";
import { TurnstileService } from "./turnstile.service.js";

const FIFTEEN_MINUTES = 15 * 60_000;

@Controller("auth")
@UseGuards(SameOriginGuard)
export class AuthController {
  private readonly production: boolean;

  constructor(
    private readonly auth: AuthService,
    private readonly turnstile: TurnstileService,
    private readonly totp: TotpService,
    config: ConfigService<Env, true>,
  ) {
    this.production = config.get("NODE_ENV", { infer: true }) === "production";
  }

  @Public()
  @Post("login")
  @HttpCode(200)
  // Per-IP: 10 attempts / 15 min on top of the per-account lockout.
  @Throttle({ default: { limit: 10, ttl: FIFTEEN_MINUTES } })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.turnstile.verify(body.turnstileToken, req.ip);
    const result = await this.auth.login(body, req.header("user-agent"));
    // Two-factor on: no cookie yet, the code step follows.
    if ("mfa" in result) return result.mfa;
    this.setRefreshCookie(res, result.refresh);
    return result.session;
  }

  /** Second sign-in step: the authenticator (or backup) code. */
  @Public()
  @Post("login/totp")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: FIFTEEN_MINUTES } })
  async loginTotp(
    @Body(new ZodValidationPipe(totpLoginSchema))
    body: z.output<typeof totpLoginSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { session, refresh } = await this.auth.loginWithTotp(
      body.mfaToken,
      body.code,
      req.header("user-agent"),
    );
    this.setRefreshCookie(res, refresh);
    return session;
  }

  @Get("totp")
  @Roles(...ROLES)
  totpStatus(@CurrentUser() user: RequestUser) {
    return this.totp.status(user.id);
  }

  @Post("totp/setup")
  @HttpCode(200)
  @Roles(...ROLES)
  @Throttle({ default: { limit: 10, ttl: FIFTEEN_MINUTES } })
  totpSetup(@CurrentUser() user: RequestUser) {
    return this.totp.setup(user.id);
  }

  @Post("totp/enable")
  @HttpCode(200)
  @Roles(...ROLES)
  @Throttle({ default: { limit: 10, ttl: FIFTEEN_MINUTES } })
  totpEnable(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(totpEnableSchema))
    body: z.output<typeof totpEnableSchema>,
  ) {
    return this.totp.enable(user.id, body.code);
  }

  @Post("totp/disable")
  @HttpCode(204)
  @Roles(...ROLES)
  @Throttle({ default: { limit: 5, ttl: FIFTEEN_MINUTES } })
  async totpDisable(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(totpDisableSchema))
    body: z.output<typeof totpDisableSchema>,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.totp.disable(user.id, body.password, body.code);
    this.clearRefreshCookie(res);
  }

  @Public()
  @Post("refresh")
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { session, refresh } = await this.auth.refresh(
        req.cookies?.[REFRESH_COOKIE],
        req.header("user-agent"),
      );
      this.setRefreshCookie(res, refresh);
      return session;
    } catch (error) {
      this.clearRefreshCookie(res);
      throw error;
    }
  }

  @Public()
  @Post("logout")
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req.cookies?.[REFRESH_COOKIE]);
    this.clearRefreshCookie(res);
  }

  @Post("logout-all")
  @HttpCode(204)
  @Roles(...ROLES)
  async logoutAll(
    @CurrentUser() user: RequestUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logoutEverywhere(user.id);
    this.clearRefreshCookie(res);
  }

  @Get("me")
  @Roles(...ROLES)
  me(@CurrentUser() user: RequestUser) {
    return this.auth.me(user.id);
  }

  @Post("change-password")
  @HttpCode(200)
  @Roles(...ROLES)
  @Throttle({ default: { limit: 5, ttl: FIFTEEN_MINUTES } })
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(changePasswordSchema))
    body: ChangePasswordInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { session, refresh } = await this.auth.changePassword(
      user,
      body,
      req.header("user-agent"),
    );
    this.setRefreshCookie(res, refresh);
    return session;
  }

  private setRefreshCookie(res: Response, refresh: IssuedRefresh) {
    res.cookie(
      REFRESH_COOKIE,
      refresh.token,
      refreshCookieOptions(this.production, refresh.maxAgeMs),
    );
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions(this.production));
  }
}
