"use client";

import {
  MEDIA_ACCEPTED_TYPES,
  MEDIA_MAX_UPLOAD_BYTES,
  type MediaAsset,
  type MediaPurpose,
} from "@aaarchive/shared/media";
import { cn } from "cn";
import { Check, ImagePlus, Images, Trash2 } from "lucide-react";
import * as React from "react";
import { MediaImage } from "@/components/store/media-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { errorText } from "@/lib/i18n/error-text";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { useMediaLibrary, useUploadMedia } from "@/lib/upload/use-media";
import { FormField } from "./form-field";

export type ImageValue = { mediaId: string; alt: string };

type ImagePickerProps = {
  id: string;
  label: string;
  purpose: MediaPurpose;
  value: ImageValue | null;
  /** The chosen asset, for the thumbnail (the form value only holds its id). */
  preview: MediaAsset | null;
  onChange: (value: ImageValue | null, preview: MediaAsset | null) => void;
  /** Alt text used when a photo is first chosen, e.g. the item's name. */
  defaultAlt?: string;
  altError?: string;
};

/**
 * Photo field for dashboard forms: upload through the API's media pipeline
 * or reuse a photo from the library, plus required alt text (PRD §6.7).
 */
export function ImagePicker({
  id,
  label,
  purpose,
  value,
  preview,
  onChange,
  defaultAlt = "",
  altError,
}: ImagePickerProps) {
  const t = getAdminMessages();
  const fileInput = React.useRef<HTMLInputElement>(null);
  const upload = useUploadMedia(purpose);
  const [problem, setProblem] = React.useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = React.useState(false);

  const choose = (asset: MediaAsset) => {
    onChange({ mediaId: asset.id, alt: value?.alt || defaultAlt }, asset);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setProblem(null);
    if (file.size > MEDIA_MAX_UPLOAD_BYTES) {
      setProblem(errorText("FILE_TOO_BIG"));
      return;
    }
    if (!(MEDIA_ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
      setProblem(errorText("UNSUPPORTED_IMAGE"));
      return;
    }
    try {
      choose(await upload.mutateAsync(file));
    } catch (error) {
      setProblem(errorText(error));
    }
  };

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-2 font-medium text-sm">{label}</legend>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="relative aspect-[4/5] w-28 shrink-0 overflow-hidden rounded-md border bg-sunken">
          {value && preview ? (
            <MediaImage media={preview} alt={value.alt} sizes="112px" fill />
          ) : (
            <ImagePlus
              aria-hidden
              className="absolute inset-0 m-auto size-6 text-subtle"
            />
          )}
        </div>
        <div className="flex flex-col items-start gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={upload.isPending}
              onClick={() => fileInput.current?.click()}
            >
              <ImagePlus />
              {upload.isPending
                ? t.media.uploading
                : value
                  ? t.media.replace
                  : t.media.upload}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setLibraryOpen(true)}
            >
              <Images />
              {t.media.library}
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                aria-label={t.media.remove}
                onClick={() => onChange(null, null)}
              >
                <Trash2 />
              </Button>
            )}
          </div>
          <p className="text-muted-foreground text-xs">{t.media.fileHint}</p>
          {problem && (
            <p role="alert" className="text-destructive text-xs">
              {problem}
            </p>
          )}
          <input
            ref={fileInput}
            type="file"
            accept={MEDIA_ACCEPTED_TYPES.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              void onFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
      </div>

      {value && (
        <FormField
          id={`${id}-alt`}
          label={t.media.alt}
          hint={t.media.altHint}
          error={altError}
        >
          <Input
            id={`${id}-alt`}
            value={value.alt}
            maxLength={160}
            aria-invalid={Boolean(altError)}
            onChange={(event) =>
              onChange({ ...value, alt: event.target.value }, preview)
            }
          />
        </FormField>
      )}

      <MediaLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        purpose={purpose}
        selectedId={value?.mediaId}
        onSelect={(asset) => {
          choose(asset);
          setLibraryOpen(false);
        }}
      />
    </fieldset>
  );
}

export function MediaLibraryDialog({
  open,
  onOpenChange,
  purpose,
  selectedId,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purpose: MediaPurpose;
  selectedId: string | undefined;
  onSelect: (asset: MediaAsset) => void;
}) {
  const t = getAdminMessages();
  const library = useMediaLibrary(purpose, open);
  const assets = library.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.media.libraryTitle}</DialogTitle>
          <DialogDescription>{t.media.fileHint}</DialogDescription>
        </DialogHeader>
        {library.isError ? (
          <p role="alert" className="text-destructive text-sm">
            {errorText(library.error)}
          </p>
        ) : library.isPending ? (
          <div
            role="status"
            aria-busy="true"
            className="grid grid-cols-3 gap-2 sm:grid-cols-4"
          >
            {Array.from({ length: 8 }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
              <Skeleton key={i} className="aspect-square w-full" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t.media.libraryEmpty}
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {assets.map((asset) => {
              const selected = asset.id === selectedId;
              return (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(asset)}
                    aria-pressed={selected}
                    aria-label={t.media.select}
                    className={cn(
                      "relative block aspect-square w-full overflow-hidden rounded-md border outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      selected && "ring-2 ring-primary",
                    )}
                  >
                    <MediaImage media={asset} alt="" sizes="160px" fill />
                    {selected && (
                      <Check
                        aria-hidden
                        className="absolute top-1 right-1 size-5 rounded-full bg-primary p-0.5 text-primary-foreground"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {library.hasNextPage && (
          <Button
            type="button"
            variant="outline"
            disabled={library.isFetchingNextPage}
            onClick={() => void library.fetchNextPage()}
          >
            {t.media.loadMore}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
