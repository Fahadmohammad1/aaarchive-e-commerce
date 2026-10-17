import {
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../config/env.schema.js";

/**
 * Supabase Storage through its S3 API, with storage-only access keys
 * (rules.md §6). Only the API writes to the bucket.
 */
@Injectable()
export class MediaStorageService {
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicBase: string | null;

  constructor(config: ConfigService<Env, true>) {
    const endpoint = config.get("MEDIA_S3_ENDPOINT", { infer: true });
    const region = config.get("MEDIA_S3_REGION", { infer: true });
    const accessKeyId = config.get("MEDIA_S3_ACCESS_KEY_ID", { infer: true });
    const secretAccessKey = config.get("MEDIA_S3_SECRET_ACCESS_KEY", {
      infer: true,
    });
    this.bucket = config.get("MEDIA_BUCKET", { infer: true });
    this.publicBase =
      config
        .get("MEDIA_PUBLIC_BASE_URL", { infer: true })
        ?.replace(/\/$/, "") ?? null;
    this.client =
      endpoint && region && accessKeyId && secretAccessKey
        ? new S3Client({
            endpoint,
            region,
            forcePathStyle: true,
            credentials: { accessKeyId, secretAccessKey },
          })
        : null;
  }

  get configured(): boolean {
    return this.client !== null && this.publicBase !== null;
  }

  publicUrl(key: string): string {
    return `${this.requirePublicBase()}/${key}`;
  }

  async put(key: string, body: Buffer): Promise<void> {
    await this.requireClient().send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: "image/webp",
        // One day: long enough for browsers, short enough that a deleted image
        // stops being served by Supabase's CDN within 24 h (verified: the CDN
        // keeps serving cached copies after delete). Production puts
        // Cloudflare in front with a longer edge TTL and purge-on-delete.
        CacheControl: "public, max-age=86400",
      }),
    );
  }

  async remove(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.requireClient().send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
      }),
    );
  }

  private requireClient(): S3Client {
    if (!this.client) throw notConfigured();
    return this.client;
  }

  private requirePublicBase(): string {
    if (!this.publicBase) throw notConfigured();
    return this.publicBase;
  }
}

function notConfigured() {
  return new ServiceUnavailableException({
    message: "Image storage is not configured",
    code: "MEDIA_NOT_CONFIGURED",
  });
}
