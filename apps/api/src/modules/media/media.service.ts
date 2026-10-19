import { randomUUID } from "node:crypto";
import type { MediaAsset, MediaPurpose } from "@aaarchive/shared/media";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { MediaRejectedError, processImage } from "./media-pipeline.js";
import { MediaStorageService } from "./media-storage.service.js";

type AssetRow = {
  id: string;
  purpose: string;
  storageKey: string;
  width: number;
  height: number;
  widths: number[];
  blurDataUrl: string;
  byteSize: number;
  createdAt: Date;
};

/** A stored image reference resolved for the dashboard. */
export type ImageRef = { mediaId: string; alt: string; media: MediaAsset };

const PREFIX: Record<MediaPurpose, string> = {
  product: "products",
  content: "content",
  brand: "brand",
};

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MediaStorageService,
  ) {}

  async upload(
    file: Buffer,
    purpose: MediaPurpose,
    userId: string,
  ): Promise<MediaAsset> {
    // Fail fast before doing image work if storage is missing.
    this.storage.publicUrl("");

    let processed: Awaited<ReturnType<typeof processImage>>;
    try {
      processed = await processImage(file);
    } catch (error) {
      if (error instanceof MediaRejectedError) {
        throw new BadRequestException({
          message: "This image cannot be used",
          code: error.code,
        });
      }
      throw error;
    }

    const storageKey = `${PREFIX[purpose]}/${randomUUID()}`;
    const keys = processed.renditions.map(
      (r) => `${storageKey}/${r.width}.webp`,
    );
    try {
      await Promise.all(
        processed.renditions.map((r, i) =>
          this.storage.put(keys[i] as string, r.data),
        ),
      );
      const row = await this.prisma.mediaAsset.create({
        data: {
          storageKey,
          purpose,
          width: processed.width,
          height: processed.height,
          widths: processed.renditions.map((r) => r.width),
          blurDataUrl: processed.blurDataUrl,
          byteSize: processed.byteSize,
          uploadedById: userId,
        },
      });
      return this.toDto(row);
    } catch (error) {
      // Never leave orphaned files behind a failed upload.
      await this.storage
        .remove(keys)
        .catch((cleanupError) =>
          this.logger.error(
            `Could not clean up ${storageKey}: ${String(cleanupError)}`,
          ),
        );
      throw error;
    }
  }

  async list(purpose: MediaPurpose | undefined, page: number, limit: number) {
    const where = purpose ? { purpose } : {};
    const [rows, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mediaAsset.count({ where }),
    ]);
    return {
      data: rows.map((r) => this.toDto(r)),
      meta: { page, limit, total },
    };
  }

  /** Deletes an image that nothing uses any more. */
  async remove(id: string): Promise<void> {
    const row = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!row)
      throw new NotFoundException({
        message: "Image not found",
        code: "NOT_FOUND",
      });
    if (await this.isReferenced(id)) {
      throw new ConflictException({
        message: "This image is still used by a product, category or page",
        code: "MEDIA_IN_USE",
      });
    }
    await this.storage.remove(
      row.widths.map((w) => `${row.storageKey}/${w}.webp`),
    );
    await this.prisma.mediaAsset.delete({ where: { id } });
  }

  /**
   * Throws 400 MEDIA_NOT_FOUND unless the image exists. Used by catalog
   * writes that store a `{ mediaId, alt }` reference.
   */
  async assertExists(id: string): Promise<void> {
    const found = await this.prisma.mediaAsset.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) {
      throw new BadRequestException({
        message: "The chosen image no longer exists",
        code: "MEDIA_NOT_FOUND",
      });
    }
  }

  /** `{ mediaId, alt, media }` for an admin response, or null. */
  toImageRef(row: AssetRow | null, alt: string | null): ImageRef | null {
    if (!row) return null;
    return { mediaId: row.id, alt: alt ?? "", media: this.toDto(row) };
  }

  private async isReferenced(id: string): Promise<boolean> {
    const [products, categories, collections, social, content, settings] =
      await Promise.all([
        this.prisma.productImage.count({ where: { mediaId: id } }),
        this.prisma.category.count({ where: { imageId: id } }),
        this.prisma.collection.count({ where: { imageId: id } }),
        this.prisma.socialPost.count({ where: { mediaId: id } }),
        // Content blocks and settings store { mediaId, alt } inside JSON.
        this.prisma.$queryRaw<{ n: number }[]>`
        select count(*)::int as n from "ContentBlock" where data::text like ${`%"mediaId":"${id}"%`}`,
        this.prisma.$queryRaw<{ n: number }[]>`
        select count(*)::int as n from "Setting" where value::text like ${`%"mediaId":"${id}"%`}`,
      ]);
    return (
      products + categories + collections + social > 0 ||
      (content[0]?.n ?? 0) > 0 ||
      (settings[0]?.n ?? 0) > 0
    );
  }

  toDto(row: AssetRow): MediaAsset {
    const renditions = row.widths
      .slice()
      .sort((a, b) => a - b)
      .map((width) => ({
        width,
        url: this.storage.publicUrl(`${row.storageKey}/${width}.webp`),
      }));
    return {
      id: row.id,
      purpose: row.purpose as MediaPurpose,
      width: row.width,
      height: row.height,
      blurDataUrl: row.blurDataUrl,
      byteSize: row.byteSize,
      url: renditions.at(-1)?.url ?? "",
      renditions,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
