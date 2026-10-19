import {
  paymentExportQuerySchema,
  paymentListQuerySchema,
  paymentRejectSchema,
  paymentVerifySchema,
} from "@aaarchive/shared/order";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import type { z } from "zod";
import { CurrentUser } from "../../common/auth/auth.decorators.js";
import type { RequestUser } from "../../common/auth/request-user.js";
import { SameOriginGuard } from "../../common/auth/same-origin.guard.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { PaymentsService } from "./payments.service.js";
import { PaymentsExportService } from "./payments-export.service.js";

/** bKash/Nagad payments to check (PRD §6.4). OWNER and STAFF. */
@Controller("admin/payments")
@UseGuards(SameOriginGuard)
export class AdminPaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly exports: PaymentsExportService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(paymentListQuerySchema))
    query: z.output<typeof paymentListQuerySchema>,
  ) {
    return this.payments.list(query);
  }

  @Get("export")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  export(
    @Query(new ZodValidationPipe(paymentExportQuerySchema))
    query: z.output<typeof paymentExportQuerySchema>,
    @Res() res: Response,
  ) {
    return this.exports.export(res, query);
  }

  @Post(":id/verify")
  @HttpCode(200)
  verify(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(paymentVerifySchema))
    body: z.output<typeof paymentVerifySchema>,
    @CurrentUser() user: RequestUser,
  ) {
    return this.payments.decide(id, "VERIFIED", body.note, user);
  }

  @Post(":id/reject")
  @HttpCode(200)
  reject(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(paymentRejectSchema))
    body: z.output<typeof paymentRejectSchema>,
    @CurrentUser() user: RequestUser,
  ) {
    return this.payments.decide(id, "REJECTED", body.note, user);
  }
}
