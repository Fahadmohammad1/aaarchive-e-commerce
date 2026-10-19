import { Module } from "@nestjs/common";
import { MediaModule } from "../media/media.module.js";
import { AdminProductsController } from "./admin-products.controller.js";
import { ProductsController, SearchController } from "./products.controller.js";
import { ProductsService } from "./products.service.js";
import { ProductsExportService } from "./products-export.service.js";
import { StoreProductsService } from "./store-products.service.js";
import { VariantsService } from "./variants.service.js";

@Module({
  imports: [MediaModule],
  controllers: [AdminProductsController, ProductsController, SearchController],
  providers: [
    ProductsService,
    VariantsService,
    ProductsExportService,
    StoreProductsService,
  ],
  exports: [ProductsService, StoreProductsService],
})
export class ProductsModule {}
