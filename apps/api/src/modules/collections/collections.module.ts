import { Module } from "@nestjs/common";
import { MediaModule } from "../media/media.module.js";
import { AdminCollectionsController } from "./admin-collections.controller.js";
import { CollectionsService } from "./collections.service.js";

@Module({
  imports: [MediaModule],
  controllers: [AdminCollectionsController],
  providers: [CollectionsService],
  exports: [CollectionsService],
})
export class CollectionsModule {}
