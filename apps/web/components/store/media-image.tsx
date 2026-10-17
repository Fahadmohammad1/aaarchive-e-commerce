import type { MediaAsset } from "@aaarchive/shared/media";
import { cn } from "@/lib/utils";

// Renders a media-library image (docs/architecture.md §4.7a). The API already
// stored WebP renditions at fixed widths, so a plain srcset lets the browser
// pick one — no image optimiser, and it works in Server Components (a
// next/image `loader` function cannot be passed from the server).
type MediaImageProps = {
  media: Pick<MediaAsset, "renditions" | "width" | "height" | "blurDataUrl">;
  alt: string;
  /** Same meaning as the HTML attribute, e.g. "(min-width: 1024px) 25vw, 50vw". */
  sizes: string;
  /** The page's main (LCP) image: load eagerly with high priority. */
  priority?: boolean;
  /** Fill the parent (which must be positioned) instead of intrinsic size. */
  fill?: boolean;
  className?: string;
};

export function MediaImage({
  media,
  alt,
  sizes,
  priority = false,
  fill = false,
  className,
}: MediaImageProps) {
  const sorted = [...media.renditions].sort((a, b) => a.width - b.width);
  const largest = sorted.at(-1);
  return (
    // biome-ignore lint/performance/noImgElement: renditions are pre-built WebP sizes; srcset is the loader
    <img
      src={largest?.url}
      srcSet={sorted.map((r) => `${r.url} ${r.width}w`).join(", ")}
      sizes={sizes}
      alt={alt}
      width={media.width}
      height={media.height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      style={{
        backgroundImage: `url(${media.blurDataUrl})`,
        backgroundSize: "cover",
      }}
      className={cn(
        fill && "absolute inset-0 size-full",
        "object-cover",
        className,
      )}
    />
  );
}
