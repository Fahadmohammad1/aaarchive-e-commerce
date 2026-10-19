import { couponApplySchema } from "@aaarchive/shared/checkout";
import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { z } from "zod";
import { Public } from "../../common/auth/auth.decorators.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { CouponsService } from "./coupons.service.js";

@Public()
@Controller("coupons")
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  /**
   * Its own limit so codes cannot be guessed quickly (rules.md §8.5). A
   * normal checkout asks 2–3 times (cart, checkout, then with the phone).
   */
  @Post("apply")
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  apply(
    @Body(new ZodValidationPipe(couponApplySchema))
    body: z.output<typeof couponApplySchema>,
  ) {
    return this.coupons.apply(body);
  }
}
