import { checkoutSchema, trackOrderSchema } from "@aaarchive/shared/checkout";
import { Body, Controller, HttpCode, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import type { z } from "zod";
import {
  CurrentUser,
  OptionalAuth,
  Public,
} from "../../common/auth/auth.decorators.js";
import type { RequestUser } from "../../common/auth/request-user.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { Throttle } from "../../common/throttle/throttle.decorator.js";
import { OrdersService } from "./orders.service.js";

const HOUR = 3_600_000;

@Public()
@Controller("orders")
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  /**
   * Place an order (PRD §5.8, §8.4). 10 per IP per hour; 3 per phone in the
   * service. Guests welcome; a signed-in customer's order joins their account.
   */
  @Post()
  @OptionalAuth()
  @Throttle({ default: { limit: 10, ttl: HOUR } })
  place(
    @Body(new ZodValidationPipe(checkoutSchema))
    body: z.output<typeof checkoutSchema>,
    @Req() req: Request,
    @CurrentUser() user: RequestUser | undefined,
  ) {
    return this.orders.place(body, req.ip, user);
  }

  /** Track with phone + order number (PRD §5.9). */
  @Post("track")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  track(
    @Body(new ZodValidationPipe(trackOrderSchema))
    body: z.output<typeof trackOrderSchema>,
  ) {
    return this.orders.track(body);
  }
}
