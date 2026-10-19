import {
  couponExportQuerySchema,
  couponInputSchema,
  couponListQuerySchema,
  couponUpdateSchema,
} from "@aaarchive/shared/coupon";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import type { z } from "zod";
import { Roles } from "../../common/auth/auth.decorators.js";
import { SameOriginGuard } from "../../common/auth/same-origin.guard.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { CouponsService } from "./coupons.service.js";
import { CouponsExportService } from "./coupons-export.service.js";

/** Reads: OWNER/STAFF (global default). Writes and export: OWNER (PRD §3, §6.9). */
@Controller("admin/coupons")
@UseGuards(SameOriginGuard)
export class AdminCouponsController {
  constructor(
    private readonly coupons: CouponsService,
    private readonly exports: CouponsExportService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(couponListQuerySchema))
    query: z.output<typeof couponListQuerySchema>,
  ) {
    return this.coupons.list(query);
  }

  /** Declared before ":id" so "export" is not an id. */
  @Get("export")
  @Roles("OWNER")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  export(
    @Query(new ZodValidationPipe(couponExportQuerySchema))
    query: z.output<typeof couponExportQuerySchema>,
    @Res() res: Response,
  ) {
    return this.exports.export(res, query);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.coupons.get(id);
  }

  @Post()
  @Roles("OWNER")
  create(
    @Body(new ZodValidationPipe(couponInputSchema))
    body: z.output<typeof couponInputSchema>,
  ) {
    return this.coupons.create(body);
  }

  @Patch(":id")
  @Roles("OWNER")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(couponUpdateSchema))
    body: z.output<typeof couponUpdateSchema>,
  ) {
    return this.coupons.update(id, body);
  }

  @Delete(":id")
  @Roles("OWNER")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.coupons.remove(id);
  }
}
