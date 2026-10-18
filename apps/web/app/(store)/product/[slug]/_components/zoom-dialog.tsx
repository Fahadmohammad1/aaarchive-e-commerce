"use client";

import { X } from "lucide-react";
import * as React from "react";
import { MediaImage } from "@/components/store/media-image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getMessages } from "@/lib/i18n/i18n";
import { cn } from "@/lib/utils";
import type { GalleryImage } from "./product-gallery";

/** Full-screen photo; tap toggles 2× at the tapped point. */
export function ZoomDialog({
  image,
  name,
  onClose,
}: {
  image: GalleryImage | null;
  name: string;
  onClose: () => void;
}) {
  const t = getMessages().pdp;
  const [origin, setOrigin] = React.useState<string | null>(null);
  return (
    <Dialog
      open={image !== null}
      onOpenChange={(open) => {
        if (open) return;
        onClose();
        setOrigin(null);
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="h-dvh max-h-none w-screen max-w-none rounded-none bg-background p-0 ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">{image?.alt || name}</DialogTitle>
        {image && (
          <button
            type="button"
            aria-label={t.zoom}
            className={cn(
              "relative h-full w-full overflow-hidden",
              origin ? "cursor-zoom-out" : "cursor-zoom-in",
            )}
            onClick={(e) => {
              if (origin) return setOrigin(null);
              const r = e.currentTarget.getBoundingClientRect();
              setOrigin(
                `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`,
              );
            }}
          >
            <span
              className={cn(
                "absolute inset-0 transition-transform duration-300",
                origin && "scale-200",
              )}
              style={origin ? { transformOrigin: origin } : undefined}
            >
              <MediaImage
                media={image.media}
                alt={image.alt || name}
                sizes="100vw"
                fill
                className="object-contain"
              />
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label={t.closeZoom}
          className="absolute top-3 right-3 flex size-10 items-center justify-center bg-primary text-primary-foreground"
        >
          <X aria-hidden strokeWidth={1.5} />
        </button>
      </DialogContent>
    </Dialog>
  );
}
