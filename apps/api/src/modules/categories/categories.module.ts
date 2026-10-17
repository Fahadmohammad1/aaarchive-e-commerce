import { Module } from "@nestjs/common";
import { MediaModule } from "../media/media.module.js";
import { AdminCategoriesController } from "./admin-categories.controller.js";
import { CategoriesService } from "./categories.service.js";

@Module({
  imports: [MediaModule],
  controllers: [AdminCategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
