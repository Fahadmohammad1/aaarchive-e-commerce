// Image validation and re-encoding (rules.md §8.4, architecture §4.7a).
// Pure functions around sharp, so they are unit-testable without storage.
import { MEDIA_WIDTHS } from "@aaarchive/shared/media";
import sharp, { type Metadata, type OutputInfo } from "sharp";

export type Rendition = { width: number; height: number; data: Buffer };

export type ProcessedImage = {
  width: number;
  height: number;
  renditions: Rendition[];
  blurDataUrl: string;
  byteSize: number;
};

export type MediaProblem =
  | "UNSUPPORTED_IMAGE"
  | "IMAGE_TOO_LARGE"
  | "IMAGE_TOO_SMALL"
  | "IMAGE_ANIMATED";

export class MediaRejectedError extends Error {
  constructor(readonly code: MediaProblem) {
    super(code);
    this.name = "MediaRejectedError";
  }
}

/** Formats we accept, as detected by decoding — never by file name or MIME header. */
const ACCEPTED = new Set(["jpeg", "png", "webp"]);

export type PipelineOptions = {
  /** Decompression-bomb guard. */
  maxPixels?: number;
  minSide?: number;
  /** Each stored object must fit the bucket limit (2 MB). */
  maxRenditionBytes?: number;
};

const DEFAULTS: Required<PipelineOptions> = {
  maxPixels: 40_000_000,
  minSide: 200,
  maxRenditionBytes: 2 * 1024 * 1024,
};

export async function processImage(
  input: Buffer,
  options: PipelineOptions = {},
): Promise<ProcessedImage> {
  const { maxPixels, minSide, maxRenditionBytes } = { ...DEFAULTS, ...options };

  let meta: Metadata;
  try {
    meta = await sharp(input, {
      limitInputPixels: maxPixels,
      failOn: "error",
    }).metadata();
  } catch (error) {
    if (String(error).includes("pixel limit"))
      throw new MediaRejectedError("IMAGE_TOO_LARGE");
    throw new MediaRejectedError("UNSUPPORTED_IMAGE");
  }
  if (!meta.format || !ACCEPTED.has(meta.format)) {
    throw new MediaRejectedError("UNSUPPORTED_IMAGE");
  }
  if ((meta.pages ?? 1) > 1) throw new MediaRejectedError("IMAGE_ANIMATED");
  if (!meta.width || !meta.height)
    throw new MediaRejectedError("UNSUPPORTED_IMAGE");
  if (meta.width * meta.height > maxPixels)
    throw new MediaRejectedError("IMAGE_TOO_LARGE");

  // Decode once, apply EXIF orientation, then drop every byte of metadata
  // (sharp writes none unless asked), so location data never leaves the phone.
  let base: { data: Buffer; info: OutputInfo };
  try {
    base = await sharp(input, { limitInputPixels: maxPixels, failOn: "error" })
      .rotate()
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new MediaRejectedError("UNSUPPORTED_IMAGE");
  }
  const width = base.info.width;
  const height = base.info.height;
  if (Math.min(width, height) < minSide)
    throw new MediaRejectedError("IMAGE_TOO_SMALL");

  const targets: number[] = MEDIA_WIDTHS.filter((w) => w < width);
  targets.push(Math.min(width, MEDIA_WIDTHS.at(-1) ?? width));
  const widths = [...new Set(targets)].sort((a, b) => a - b);

  const renditions: Rendition[] = [];
  for (const w of widths) {
    let quality = 80;
    let out = await encode(base.data, w, quality);
    while (out.data.length > maxRenditionBytes && quality > 40) {
      quality -= 15;
      out = await encode(base.data, w, quality);
    }
    if (out.data.length > maxRenditionBytes)
      throw new MediaRejectedError("IMAGE_TOO_LARGE");
    renditions.push({
      width: out.info.width,
      height: out.info.height,
      data: out.data,
    });
  }

  const blur = await sharp(base.data)
    .resize({ width: 16 })
    .webp({ quality: 40 })
    .toBuffer();
  const largest = renditions.at(-1);
  if (!largest) throw new MediaRejectedError("UNSUPPORTED_IMAGE");

  return {
    width: largest.width,
    height: largest.height,
    renditions,
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
    byteSize: renditions.reduce((sum, r) => sum + r.data.length, 0),
  };
}

function encode(data: Buffer, width: number, quality: number) {
  return sharp(data)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, effort: 4 })
    .toBuffer({ resolveWithObject: true });
}
