import {
  MEDIA_MAX_UPLOAD_BYTES,
  MEDIA_PURPOSES,
  type MediaPurpose,
  mediaUploadFieldsSchema,
} from "@aaarchive/shared/media";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { z } from "zod";
import { CurrentUser } from "../../common/auth/auth.decorators.js";
import type { RequestUser } from "../../common/auth/request-user.js";
import { SameOriginGuard } from "../../common/auth/same-origin.guard.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { Throttle } from "../../common/throttle/throttle.decorator.js";
import { MediaService } from "./media.service.js";

const listQuerySchema = z.strictObject({
  purpose: z.enum(MEDIA_PURPOSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(40),
});

/** Media library — OWNER/STAFF only (global default). */
@Controller("admin/media")
@UseGuards(SameOriginGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor("file", {
      // Memory storage: the file is re-encoded, never written to disk as-is.
      limits: {
        fileSize: MEDIA_MAX_UPLOAD_BYTES,
        files: 1,
        fields: 4,
        parts: 6,
      },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body(new ZodValidationPipe(mediaUploadFieldsSchema)) body: {
      purpose: MediaPurpose;
    },
    @CurrentUser() user: RequestUser,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException({
        message: "Choose an image to upload",
        code: "FILE_REQUIRED",
      });
    }
    return this.media.upload(file.buffer, body.purpose, user.id);
  }

  @Get()
  list(
    @Query(new ZodValidationPipe(listQuerySchema)) query: z.infer<
      typeof listQuerySchema
    >,
  ) {
    return this.media.list(query.purpose, query.page, query.limit);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.media.remove(id);
  }
}
