import { Module } from "@nestjs/common";
import { MediaModule } from "../media/media.module.js";
import { AdminProductsController } from "./admin-products.controller.js";
import { ProductsService } from "./products.service.js";
import { VariantsService } from "./variants.service.js";

@Module({
  imports: [MediaModule],
  controllers: [AdminProductsController],
  providers: [ProductsService, VariantsService],
  exports: [ProductsService],
})
export class ProductsModule {}
