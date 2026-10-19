import {
  blockedPhoneListQuerySchema,
  blockPhoneSchema,
  customerExportQuerySchema,
  customerListQuerySchema,
} from "@aaarchive/shared/customer";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import type { z } from "zod";
import { CurrentUser } from "../../common/auth/auth.decorators.js";
import type { RequestUser } from "../../common/auth/request-user.js";
import { SameOriginGuard } from "../../common/auth/same-origin.guard.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { Throttle } from "../../common/throttle/throttle.decorator.js";
import { CustomersService } from "./customers.service.js";
import { CustomersExportService } from "./customers-export.service.js";

/** Customers by phone (PRD §6.5). OWNER and STAFF. */
@Controller("admin/customers")
@UseGuards(SameOriginGuard)
export class AdminCustomersController {
  constructor(
    private readonly customers: CustomersService,
    private readonly exports: CustomersExportService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(customerListQuerySchema))
    query: z.output<typeof customerListQuerySchema>,
  ) {
    return this.customers.list(query);
  }

  @Get("export")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  export(
    @Query(new ZodValidationPipe(customerExportQuerySchema))
    query: z.output<typeof customerExportQuerySchema>,
    @Res() res: Response,
  ) {
    return this.exports.export(res, query);
  }

  @Get(":phone")
  get(@Param("phone") phone: string) {
    return this.customers.get(phone);
  }
}

/** The COD blocklist (PRD §5.8, §6.5). OWNER and STAFF. */
@Controller("admin/blocked-phones")
@UseGuards(SameOriginGuard)
export class AdminBlockedPhonesController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(blockedPhoneListQuerySchema))
    query: z.output<typeof blockedPhoneListQuerySchema>,
  ) {
    return this.customers.listBlocked(query.q, query.page, query.limit);
  }

  @Post()
  block(
    @Body(new ZodValidationPipe(blockPhoneSchema))
    body: z.output<typeof blockPhoneSchema>,
    @CurrentUser() user: RequestUser,
  ) {
    return this.customers.block(body.phone, body.reason, user);
  }

  @Delete(":id")
  @HttpCode(204)
  unblock(@Param("id") id: string) {
    return this.customers.unblock(id);
  }
}
