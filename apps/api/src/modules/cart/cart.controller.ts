import { cartValidateSchema } from "@aaarchive/shared/checkout";
import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import type { z } from "zod";
import { Public } from "../../common/auth/auth.decorators.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { CartService } from "./cart.service.js";

@Public()
@Controller("cart")
export class CartController {
  constructor(private readonly cart: CartService) {}

  /** Re-checks a cart when it opens: prices, availability, stock status. */
  @Post("validate")
  @HttpCode(200)
  validate(
    @Body(new ZodValidationPipe(cartValidateSchema))
    body: z.output<typeof cartValidateSchema>,
  ) {
    return this.cart.validate(body.items);
  }
}
