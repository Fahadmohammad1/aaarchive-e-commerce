import { ImageOff } from "lucide-react";
import { MediaImage } from "@/components/store/media-image";
import type { ImageRef } from "@/lib/category/category-schemas";

/** Small square photo for catalog tables. */
export function GroupThumb({ image }: { image: ImageRef | null }) {
  return (
    <div className="relative size-10 overflow-hidden rounded-md border bg-sunken">
      {image ? (
        <MediaImage media={image.media} alt={image.alt} sizes="40px" fill />
      ) : (
        <ImageOff
          aria-hidden
          className="absolute inset-0 m-auto size-4 text-subtle"
        />
      )}
    </div>
  );
}
