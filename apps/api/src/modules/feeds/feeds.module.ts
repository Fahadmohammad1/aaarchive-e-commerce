import { Module } from "@nestjs/common";
import { MediaModule } from "../media/media.module.js";
import { FeedsController } from "./feeds.controller.js";

@Module({ imports: [MediaModule], controllers: [FeedsController] })
export class FeedsModule {}
