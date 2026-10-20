import { timingSafeEqual } from "node:crypto";
import {
  type ForgotPasswordInput,
  forgotPasswordSchema,
  type RegisterInput,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "@aaarchive/shared/account";
import { type LoginInput, loginSchema } from "@aaarchive/shared/auth";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";
import type { z } from "zod";
import { Public } from "../../common/auth/auth.decorators.js";
import { SameOriginGuard } from "../../common/auth/same-origin.guard.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { Throttle } from "../../common/throttle/throttle.decorator.js";
import type { Env } from "../../config/env.schema.js";
import { TurnstileService } from "../auth/turnstile.service.js";
import {
  CUSTOMER_REFRESH_COOKIE,
  customerCookieOptions,
  GOOGLE_STATE_COOKIE,
  GOOGLE_STATE_COOKIE_PATH,
  GOOGLE_STATE_TTL_MS,
} from "./account.constants.js";
import { AccountAuthService } from "./account-auth.service.js";
import {
  clearCustomerSession,
  safeCustomerNext,
  setCustomerSession,
} from "./account-cookies.js";
import {
  GoogleOAuthService,
  type GoogleState,
} from "./google-oauth.service.js";

const FIFTEEN_MINUTES = 15 * 60_000;
const HOUR = 3_600_000;

/** Customer sign-up / sign-in (PRD §5.10). Same protections as the dashboard's. */
@Public()
@Controller("account/auth")
@UseGuards(SameOriginGuard)
export class AccountAuthController {
  private readonly logger = new Logger("Security");
  private readonly production: boolean;
  private readonly siteOrigin: string;

  constructor(
    private readonly accounts: AccountAuthService,
    private readonly turnstile: TurnstileService,
    private readonly google: GoogleOAuthService,
    config: ConfigService<Env, true>,
  ) {
    this.production = config.get("NODE_ENV", { infer: true }) === "production";
    this.siteOrigin = new URL(
      config.get("FRONTEND_ORIGIN", { infer: true }),
    ).origin;
  }

  @Post("register")
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: HOUR } })
  async register(
    @Body(new ZodValidationPipe(registerSchema))
    body: z.output<typeof registerSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.turnstile.verify(body.turnstileToken, req.ip);
    const { session, refresh } = await this.accounts.register(
      body as RegisterInput & { email: string },
      req.header("user-agent"),
    );
    setCustomerSession(res, refresh, this.production);
    return session;
  }

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
    const { session, refresh } = await this.accounts.login(
      body,
      req.header("user-agent"),
    );
    setCustomerSession(res, refresh, this.production);
    return session;
  }

  @Post("refresh")
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { session, refresh } = await this.accounts.refresh(
        req.cookies?.[CUSTOMER_REFRESH_COOKIE],
        req.header("user-agent"),
      );
      setCustomerSession(res, refresh, this.production);
      return session;
    } catch (error) {
      clearCustomerSession(res, this.production);
      throw error;
    }
  }

  @Post("logout")
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[CUSTOMER_REFRESH_COOKIE];
    if (typeof raw === "string") await this.accounts.logout(raw);
    clearCustomerSession(res, this.production);
  }

  /** Always 204, whether or not the email has an account. */
  @Post("forgot-password")
  @HttpCode(204)
  @Throttle({ default: { limit: 5, ttl: HOUR } })
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema))
    body: z.output<typeof forgotPasswordSchema>,
    @Req() req: Request,
  ) {
    await this.turnstile.verify(body.turnstileToken, req.ip);
    await this.accounts.forgotPassword(
      body as ForgotPasswordInput & { email: string },
    );
  }

  @Post("reset-password")
  @HttpCode(204)
  @Throttle({ default: { limit: 10, ttl: HOUR } })
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema))
    body: z.output<typeof resetPasswordSchema>,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.accounts.resetPassword(body.token, body.password);
    // Every session ended, this browser's too: sign in with the new password.
    clearCustomerSession(res, this.production);
  }

  @Post("verify-email")
  @HttpCode(204)
  @Throttle({ default: { limit: 20, ttl: HOUR } })
  async verifyEmail(
    @Body(new ZodValidationPipe(verifyEmailSchema))
    body: z.output<typeof verifyEmailSchema>,
  ) {
    await this.accounts.verifyEmail(body.token);
  }

  /** Starts Google sign-in: a top-level navigation from the sign-in page. */
  @Get("google")
  @Throttle({ default: { limit: 20, ttl: FIFTEEN_MINUTES } })
  googleStart(@Query("next") next: unknown, @Res() res: Response) {
    if (!this.google.configured) {
      return res.redirect(303, `${this.siteOrigin}/account/login?error=google`);
    }
    const { url, state } = this.google.start(safeCustomerNext(next));
    res.cookie(
      GOOGLE_STATE_COOKIE,
      Buffer.from(JSON.stringify(state)).toString("base64url"),
      customerCookieOptions(
        this.production,
        GOOGLE_STATE_COOKIE_PATH,
        GOOGLE_STATE_TTL_MS,
      ),
    );
    return res.redirect(303, url);
  }

  @Get("google/callback")
  @Throttle({ default: { limit: 20, ttl: FIFTEEN_MINUTES } })
  async googleCallback(
    @Query("code") code: unknown,
    @Query("state") state: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const saved = readGoogleState(req.cookies?.[GOOGLE_STATE_COOKIE]);
    res.clearCookie(
      GOOGLE_STATE_COOKIE,
      customerCookieOptions(this.production, GOOGLE_STATE_COOKIE_PATH),
    );
    const failed = () =>
      res.redirect(303, `${this.siteOrigin}/account/login?error=google`);

    // The state ties this callback to the sign-in this browser started (CSRF).
    if (
      !saved ||
      typeof code !== "string" ||
      typeof state !== "string" ||
      !sameText(state, saved.state)
    ) {
      this.logger.warn("Google sign-in callback refused (state mismatch)");
      return failed();
    }
    try {
      const identity = await this.google.identify(code, saved.verifier);
      const { refresh } = await this.accounts.googleSignIn(
        identity,
        req.header("user-agent"),
      );
      setCustomerSession(res, refresh, this.production);
      return res.redirect(
        303,
        `${this.siteOrigin}${safeCustomerNext(saved.next)}`,
      );
    } catch (error) {
      this.logger.warn(`Google sign-in failed: ${String(error)}`);
      return failed();
    }
  }
}

function readGoogleState(raw: unknown): GoogleState | null {
  if (typeof raw !== "string" || raw.length > 1024) return null;
  try {
    const value = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as Partial<GoogleState>;
    return typeof value.state === "string" &&
      typeof value.verifier === "string" &&
      typeof value.next === "string"
      ? (value as GoogleState)
      : null;
  } catch {
    return null;
  }
}

function sameText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
