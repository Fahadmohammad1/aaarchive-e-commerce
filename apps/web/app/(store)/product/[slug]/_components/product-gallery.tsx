"use client";

import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";
import { MediaImage } from "@/components/store/media-image";
import { format, getMessages } from "@/lib/i18n/i18n";
import type { StoreProduct } from "@/lib/product/product-store-schemas";
import { cn } from "@/lib/utils";
import { useProductSelection } from "./product-selection";

export type GalleryImage = StoreProduct["images"][number];
type Image = GalleryImage;

// The zoom dialog loads on the first tap of a photo (storefront JS budget).
const ZoomDialog = dynamic(
  () => import("./zoom-dialog").then((m) => m.ZoomDialog),
  {
    ssr: false,
  },
);

/** Photos for the colour: its own photos first, then the shared ones. */
function imagesFor(images: Image[], colorId: string | null): Image[] {
  const own = images.filter((i) => i.colorId && i.colorId === colorId);
  const shared = images.filter((i) => !i.colorId);
  if (own.length) return [...own, ...shared];
  return shared.length ? shared : images;
}

/**
 * Gallery (design §7.2): swipe on phones (scroll-snap, `1/5` counter),
 * thumbnails on desktop, tap to zoom. No library: native scrolling.
 */
export function ProductGallery({
  images,
  name,
}: {
  images: Image[];
  name: string;
}) {
  const t = getMessages().pdp;
  const { colorId } = useProductSelection();
  const shown = React.useMemo(
    () => imagesFor(images, colorId),
    [images, colorId],
  );
  const track = React.useRef<HTMLUListElement>(null);
  const [index, setIndex] = React.useState(0);
  const [zoom, setZoomIndex] = React.useState<number | null>(null);
  const [zoomLoaded, setZoomLoaded] = React.useState(false);
  const setZoom = (i: number | null) => {
    if (i !== null) setZoomLoaded(true);
    setZoomIndex(i);
  };

  // A new colour starts at its first photo.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset on colour change only
  React.useEffect(() => {
    setIndex(0);
    track.current?.scrollTo({ left: 0 });
  }, [colorId]);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(shown.length - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  if (shown.length === 0) {
    return <div className="aspect-[4/5] bg-sunken" aria-hidden />;
  }

  return (
    <section aria-label={t.gallery} className="flex gap-3 md:flex-row-reverse">
      <div className="relative min-w-0 flex-1">
        <ul
          ref={track}
          className="scrollbar-none flex snap-x snap-mandatory overflow-x-auto"
          onScroll={(e) => {
            const el = e.currentTarget;
            setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
          }}
        >
          {shown.map((image, i) => (
            <li
              key={image.media.id}
              className="relative aspect-[4/5] w-full shrink-0 snap-center bg-sunken"
              aria-roledescription="slide"
              aria-label={format(t.photo, {
                index: i + 1,
                count: shown.length,
              })}
            >
              <button
                type="button"
                className="group/zoom absolute inset-0 cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`${t.zoom}: ${image.alt || name}`}
                onClick={() => setZoom(i)}
              >
                <MediaImage
                  media={image.media}
                  alt={image.alt || name}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  priority={i === 0}
                  fill
                />
                <ZoomIn
                  aria-hidden
                  strokeWidth={1.5}
                  className="absolute right-3 bottom-3 size-5 opacity-0 transition-opacity group-hover/zoom:opacity-100"
                />
              </button>
            </li>
          ))}
        </ul>
        {shown.length > 1 && (
          <>
            <p
              className="absolute top-3 right-3 bg-background/80 px-1.5 type-mono-micro"
              aria-hidden
            >
              {index + 1}/{shown.length}
            </p>
            <div className="pointer-events-none absolute inset-x-3 top-1/2 hidden -translate-y-1/2 justify-between md:flex [&>button]:pointer-events-auto">
              <button
                type="button"
                aria-label={t.previousPhoto}
                disabled={index === 0}
                onClick={() => go(index - 1)}
                className="flex size-10 items-center justify-center border border-line-strong bg-background disabled:opacity-40"
              >
                <ChevronLeft aria-hidden strokeWidth={1.5} />
              </button>
              <button
                type="button"
                aria-label={t.nextPhoto}
                disabled={index === shown.length - 1}
                onClick={() => go(index + 1)}
                className="flex size-10 items-center justify-center bg-primary text-primary-foreground disabled:opacity-40"
              >
                <ChevronRight aria-hidden strokeWidth={1.5} />
              </button>
            </div>
          </>
        )}
      </div>
      {shown.length > 1 && (
        <ul className="hidden w-16 shrink-0 flex-col gap-2 md:flex lg:w-20">
          {shown.map((image, i) => (
            <li key={image.media.id}>
              <button
                type="button"
                aria-label={format(t.showPhoto, { index: i + 1 })}
                aria-current={i === index}
                onClick={() => go(i)}
                className={cn(
                  "relative block aspect-[4/5] w-full overflow-hidden bg-sunken outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  i === index
                    ? "ring-1 ring-foreground"
                    : "opacity-60 hover:opacity-100",
                )}
              >
                <MediaImage media={image.media} alt="" sizes="80px" fill />
              </button>
            </li>
          ))}
        </ul>
      )}

      {zoomLoaded && (
        <ZoomDialog
          image={zoom === null ? null : (shown[zoom] ?? null)}
          name={name}
          onClose={() => setZoom(null)}
        />
      )}
    </section>
  );
}
