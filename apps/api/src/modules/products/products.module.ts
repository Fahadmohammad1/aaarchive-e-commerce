import { Module } from "@nestjs/common";
import { MediaModule } from "../media/media.module.js";
import { AdminProductsController } from "./admin-products.controller.js";
import { ProductsService } from "./products.service.js";
import { ProductsExportService } from "./products-export.service.js";
import { VariantsService } from "./variants.service.js";

@Module({
  imports: [MediaModule],
  controllers: [AdminProductsController],
  providers: [ProductsService, VariantsService, ProductsExportService],
  exports: [ProductsService],
})
export class ProductsModule {}
