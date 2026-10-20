import { Body, Controller, HttpCode, Post, Res } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import { z } from "zod";
import { Public } from "../../common/auth/auth.decorators.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { Throttle } from "../../common/throttle/throttle.decorator.js";
import type { Env } from "../../config/env.schema.js";
import { type PaymentResult, SslcommerzService } from "./sslcommerz.service.js";

/** SSLCommerz posts form fields; only these two are read (and then checked with SSLCommerz). */
const returnSchema = z.looseObject({
  val_id: z.string().trim().max(100).optional(),
  tran_id: z.string().trim().max(100).optional(),
});
type ReturnBody = z.output<typeof returnSchema>;

/**
 * Where SSLCommerz sends the customer's browser back (form POSTs) and its
 * server-to-server IPN. Nothing posted here is trusted: every path asks
 * SSLCommerz's API before an order changes.
 */
@Public()
@Controller("payments/sslcommerz")
export class SslcommerzController {
  private readonly siteOrigin: string;

  constructor(
    private readonly payments: SslcommerzService,
    config: ConfigService<Env, true>,
  ) {
    this.siteOrigin = new URL(
      config.get("FRONTEND_ORIGIN", { infer: true }),
    ).origin;
  }

  @Post("success")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async success(
    @Body(new ZodValidationPipe(returnSchema)) body: ReturnBody,
    @Res() res: Response,
  ) {
    const result = body.val_id
      ? await this.payments.confirm(body.val_id)
      : body.tran_id
        ? await this.payments.abandon(body.tran_id, "failed")
        : ({ outcome: "failed" } as const);
    this.sendBack(res, result);
  }

  @Post("fail")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async fail(
    @Body(new ZodValidationPipe(returnSchema)) body: ReturnBody,
    @Res() res: Response,
  ) {
    const result = body.tran_id
      ? await this.payments.abandon(body.tran_id, "failed")
      : ({ outcome: "failed" } as const);
    this.sendBack(res, result);
  }

  @Post("cancel")
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async cancel(
    @Body(new ZodValidationPipe(returnSchema)) body: ReturnBody,
    @Res() res: Response,
  ) {
    const result = body.tran_id
      ? await this.payments.abandon(body.tran_id, "cancelled")
      : ({ outcome: "cancelled" } as const);
    this.sendBack(res, result);
  }

  /** Instant payment notification from SSLCommerz's servers. */
  @Post("ipn")
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async ipn(@Body(new ZodValidationPipe(returnSchema)) body: ReturnBody) {
    if (body.val_id) await this.payments.confirm(body.val_id);
    else if (body.tran_id) await this.payments.abandon(body.tran_id, "failed");
    return { received: true };
  }

  private sendBack(res: Response, result: PaymentResult) {
    // 303: the browser follows with a GET, never re-posting the form.
    const target =
      result.outcome === "paid" || result.outcome === "review"
        ? `/order/success/${encodeURIComponent(result.orderNumber)}?payment=${result.outcome}`
        : `/checkout?payment=${result.outcome}`;
    res.redirect(303, `${this.siteOrigin}${target}`);
  }
}
