import { Module } from "@nestjs/common";
import { AdminSizesController } from "./admin-sizes.controller.js";
import { SizesService } from "./sizes.service.js";

@Module({
  controllers: [AdminSizesController],
  providers: [SizesService],
  exports: [SizesService],
})
export class SizesModule {}
