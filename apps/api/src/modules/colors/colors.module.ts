import { Module } from "@nestjs/common";
import { AdminColorsController } from "./admin-colors.controller.js";
import { ColorsService } from "./colors.service.js";

@Module({
  controllers: [AdminColorsController],
  providers: [ColorsService],
  exports: [ColorsService],
})
export class ColorsModule {}
