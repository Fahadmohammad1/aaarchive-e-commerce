import {
  adminOrderListQuerySchema,
  orderBulkStatusSchema,
  orderEditSchema,
  orderExportQuerySchema,
  orderNoteSchema,
  orderStatusChangeSchema,
} from "@aaarchive/shared/order";
import {
  Body,
  Controller,
  Get,
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
import { CurrentUser } from "../../common/auth/auth.decorators.js";
import type { RequestUser } from "../../common/auth/request-user.js";
import { SameOriginGuard } from "../../common/auth/same-origin.guard.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { AdminOrdersService } from "./admin-orders.service.js";
import { OrdersExportService } from "./orders-export.service.js";

/**
 * Order management (PRD §6.4). OWNER and STAFF (the global default): the
 * Order Manager role exists for exactly this.
 */
@Controller("admin/orders")
@UseGuards(SameOriginGuard)
export class AdminOrdersController {
  constructor(
    private readonly orders: AdminOrdersService,
    private readonly exports: OrdersExportService,
  ) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(adminOrderListQuerySchema))
    query: z.output<typeof adminOrderListQuerySchema>,
  ) {
    return this.orders.list(query);
  }

  /** Declared before ":id". One row per order (PRD §6.9). */
  @Get("export")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  export(
    @Query(new ZodValidationPipe(orderExportQuerySchema))
    query: z.output<typeof orderExportQuerySchema>,
    @Res() res: Response,
  ) {
    return this.exports.exportOrders(res, query);
  }

  /** One row per order item, same filters (PRD §6.9). */
  @Get("items/export")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  exportItems(
    @Query(new ZodValidationPipe(orderExportQuerySchema))
    query: z.output<typeof orderExportQuerySchema>,
    @Res() res: Response,
  ) {
    return this.exports.exportItems(res, query);
  }

  @Post("bulk-status")
  bulkStatus(
    @Body(new ZodValidationPipe(orderBulkStatusSchema))
    body: z.output<typeof orderBulkStatusSchema>,
    @CurrentUser() user: RequestUser,
  ) {
    return this.orders.bulkStatus(body, user);
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.orders.get(id);
  }

  @Patch(":id")
  edit(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(orderEditSchema))
    body: z.output<typeof orderEditSchema>,
    @CurrentUser() user: RequestUser,
  ) {
    return this.orders.edit(id, body, user);
  }

  @Patch(":id/status")
  changeStatus(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(orderStatusChangeSchema))
    body: z.output<typeof orderStatusChangeSchema>,
    @CurrentUser() user: RequestUser,
  ) {
    return this.orders.changeStatus(id, body, user);
  }

  @Post(":id/notes")
  addNote(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(orderNoteSchema))
    body: z.output<typeof orderNoteSchema>,
    @CurrentUser() user: RequestUser,
  ) {
    return this.orders.addNote(id, body, user);
  }
}
