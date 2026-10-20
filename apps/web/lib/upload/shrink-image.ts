// Shrinks big photos in the browser before upload (2026-10-21). Hosts cap
// request bodies (Vercel: 4.5 MB) and phone photos are often larger; the API
// keeps at most 1600px anyway (architecture §4.7a), so nothing visible is
// lost. The API still validates and re-encodes whatever arrives.

/** Files at or below this are sent untouched. */
export const UPLOAD_TARGET_BYTES = 4 * 1024 * 1024;
/** Longest side: room above the largest stored width, then that width itself. */
const MAX_SIDES = [2560, 1600];
const QUALITIES = [0.9, 0.8, 0.7, 0.6];

function toBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Returns `file` unchanged when it is small enough, or a smaller WebP/JPEG
 * copy. If the browser cannot decode or shrink it, the original goes to the
 * API, which gives the real answer (unsupported or too big).
 */
export async function shrinkForUpload(file: File): Promise<File> {
  if (file.size <= UPLOAD_TARGET_BYTES) return file;

  let bitmap: ImageBitmap;
  try {
    // Applies the phone's EXIF rotation before resizing.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  try {
    for (const side of MAX_SIDES) {
      const smaller = await encodeAt(bitmap, side, file.name);
      if (smaller) return smaller;
    }
    return file;
  } finally {
    bitmap.close();
  }
}

/** The bitmap at most `maxSide` long, encoded under the target, or null. */
async function encodeAt(
  bitmap: ImageBitmap,
  maxSide: number,
  fileName: string,
): Promise<File | null> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) return null;

  const draw = (background: string | null) => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (background) {
      // JPEG has no transparency: paint white instead of black.
      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  };

  // WebP keeps transparency; Safari cannot encode it and hands back PNG,
  // so fall back to JPEG there.
  draw(null);
  let type = "image/webp";
  const probe = await toBlob(canvas, type, QUALITIES[0] ?? 0.9);
  if (probe?.type !== type) {
    type = "image/jpeg";
    draw("#ffffff");
  }

  for (const quality of QUALITIES) {
    const blob =
      quality === QUALITIES[0] && type === "image/webp"
        ? probe
        : await toBlob(canvas, type, quality);
    if (blob && blob.size <= UPLOAD_TARGET_BYTES) {
      const ext = type === "image/webp" ? "webp" : "jpg";
      const name = `${fileName.replace(/\.[^.]+$/, "") || "photo"}.${ext}`;
      return new File([blob], name, { type });
    }
  }
  return null;
}
