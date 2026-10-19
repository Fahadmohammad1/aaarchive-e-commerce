import { cacheTags } from "@aaarchive/shared/cache-tags";
import type { socialPostInputSchema } from "@aaarchive/shared/content";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { z } from "zod";
import { isNotFound } from "../../common/prisma/prisma-errors.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { MediaService } from "../media/media.service.js";
import { RevalidationService } from "../revalidation/revalidation.service.js";

type Input = z.output<typeof socialPostInputSchema>;

const include = { media: true } as const;

/** "Follow our style journey" posts (PRD H6, §6.7). Writes: OWNER. */
@Injectable()
export class SocialPostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly revalidation: RevalidationService,
  ) {}

  private toAdmin(row: Awaited<ReturnType<typeof this.findRow>>) {
    return {
      id: row.id,
      image: {
        mediaId: row.mediaId,
        alt: row.alt,
        media: this.media.toDto(row.media),
      },
      label: row.label,
      platform: row.platform,
      link: row.link,
      sortOrder: row.sortOrder,
      isActive: row.isActive,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private findRow(id: string) {
    return this.prisma.socialPost.findUniqueOrThrow({ where: { id }, include });
  }

  async list() {
    const rows = await this.prisma.socialPost.findMany({
      include,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return { data: rows.map((r) => this.toAdmin(r)) };
  }

  async create(input: Input) {
    await this.media.assertExists(input.image.mediaId);
    const row = await this.prisma.socialPost.create({
      data: this.data(input),
      include,
    });
    void this.revalidation.revalidate([cacheTags.home, cacheTags.content]);
    return this.toAdmin(row);
  }

  async update(id: string, input: Input) {
    await this.media.assertExists(input.image.mediaId);
    const row = await this.prisma.socialPost
      .update({ where: { id }, data: this.data(input), include })
      .catch(rethrow);
    void this.revalidation.revalidate([cacheTags.home, cacheTags.content]);
    return this.toAdmin(row);
  }

  async remove(id: string) {
    await this.prisma.socialPost.delete({ where: { id } }).catch(rethrow);
    void this.revalidation.revalidate([cacheTags.home, cacheTags.content]);
  }

  private data(input: Input) {
    return {
      mediaId: input.image.mediaId,
      alt: input.image.alt,
      label: input.label,
      platform: input.platform,
      link: input.link,
      sortOrder: input.sortOrder,
      isActive: input.isActive,
    };
  }
}

function rethrow(error: unknown): never {
  if (isNotFound(error)) {
    throw new NotFoundException({
      message: "Post not found",
      code: "NOT_FOUND",
    });
  }
  throw error;
}
