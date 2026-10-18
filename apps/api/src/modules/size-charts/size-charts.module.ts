import { Module } from "@nestjs/common";
import { AdminSizeChartsController } from "./admin-size-charts.controller.js";
import { SizeChartsService } from "./size-charts.service.js";

@Module({
  controllers: [AdminSizeChartsController],
  providers: [SizeChartsService],
  exports: [SizeChartsService],
})
export class SizeChartsModule {}
