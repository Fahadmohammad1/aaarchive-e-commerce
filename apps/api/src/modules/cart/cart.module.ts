import { Module } from "@nestjs/common";
import { MediaModule } from "../media/media.module.js";
import { CartController } from "./cart.controller.js";
import { CartService } from "./cart.service.js";
import { PricingService } from "./pricing.service.js";

@Module({
  imports: [MediaModule],
  controllers: [CartController],
  providers: [PricingService, CartService],
  exports: [PricingService],
})
export class CartModule {}
