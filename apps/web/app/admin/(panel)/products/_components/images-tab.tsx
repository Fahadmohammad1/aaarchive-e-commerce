"use client";

import {
  MEDIA_ACCEPTED_TYPES,
  MEDIA_MAX_UPLOAD_BYTES,
  type MediaAsset,
} from "@aaarchive/shared/media";
import {
  PRODUCT_MAX_IMAGES,
  type ProductImageInput,
} from "@aaarchive/shared/product";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Images,
  Star,
  Trash2,
} from "lucide-react";
import * as React from "react";
import { Controller } from "react-hook-form";
import { MediaLibraryDialog } from "@/components/admin/image-picker";
import { NativeSelect } from "@/components/admin/native-select";
import { MediaImage } from "@/components/store/media-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useColors } from "@/lib/color/use-colors";
import { errorText, fieldErrorText } from "@/lib/i18n/error-text";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { useUploadMedia } from "@/lib/upload/use-media";
import type { ProductForm } from "./product-form-types";

type Previews = Map<string, MediaAsset>;

export function ImagesTab({
  form,
  previews,
  onPreview,
}: {
  form: ProductForm;
  /** Assets for thumbnails (the form value only holds media ids). */
  previews: Previews;
  onPreview: (asset: MediaAsset) => void;
}) {
  return (
    <Controller
      control={form.control}
      name="images"
      render={({ field, fieldState }) => (
        <Gallery
          value={field.value ?? []}
          onChange={field.onChange}
          error={fieldState.error}
          productName={form.getValues("name")}
          previews={previews}
          onPreview={onPreview}
        />
      )}
    />
  );
}

function Gallery({
  value,
  onChange,
  error,
  productName,
  previews,
  onPreview,
}: {
  value: ProductImageInput[];
  onChange: (images: ProductImageInput[]) => void;
  error: unknown;
  productName: string;
  previews: Previews;
  onPreview: (asset: MediaAsset) => void;
}) {
  const t = getAdminMessages();
  const ti = t.products.images;
  const colors = useColors();
  const upload = useUploadMedia("product");
  const fileInput = React.useRef<HTMLInputElement>(null);
  const [libraryOpen, setLibraryOpen] = React.useState(false);
  const [problem, setProblem] = React.useState<string | null>(null);
  const full = value.length >= PRODUCT_MAX_IMAGES;

  const add = (assets: MediaAsset[], current: ProductImageInput[]) => {
    const next = [...current];
    for (const asset of assets) {
      onPreview(asset);
      if (next.some((i) => i.mediaId === asset.id)) continue;
      if (next.length >= PRODUCT_MAX_IMAGES) break;
      next.push({ mediaId: asset.id, alt: productName, colorId: null });
    }
    onChange(next);
    return next;
  };

  const onFiles = async (files: File[]) => {
    setProblem(null);
    let current = value;
    for (const file of files) {
      if (file.size > MEDIA_MAX_UPLOAD_BYTES) {
        setProblem(errorText("FILE_TOO_BIG"));
        continue;
      }
      if (!(MEDIA_ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
        setProblem(errorText("UNSUPPORTED_IMAGE"));
        continue;
      }
      try {
        // One at a time: the pipeline is heavy and rate-limited.
        current = add([await upload.mutateAsync(file)], current);
      } catch (e) {
        setProblem(errorText(e));
      }
    }
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    if (item) next.splice(to, 0, item);
    onChange(next);
  };
  const patch = (index: number, changes: Partial<ProductImageInput>) =>
    onChange(
      value.map((img, i) => (i === index ? { ...img, ...changes } : img)),
    );

  const altError = (index: number) => {
    const node = (
      error as Record<number, { alt?: { message?: string } }> | undefined
    )?.[index];
    return node?.alt?.message;
  };
  const listError = (error as { message?: string } | undefined)?.message;

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-prose text-muted-foreground text-sm">{ti.intro}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={upload.isPending || full}
          onClick={() => fileInput.current?.click()}
        >
          <ImagePlus />
          {upload.isPending ? t.media.uploading : ti.upload}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={full}
          onClick={() => setLibraryOpen(true)}
        >
          <Images />
          {t.media.library}
        </Button>
        <span className="text-muted-foreground text-xs">
          {full
            ? format(ti.max, { max: PRODUCT_MAX_IMAGES })
            : t.media.fileHint}
        </span>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={MEDIA_ACCEPTED_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={(event) => {
            void onFiles([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
      </div>
      {(problem || listError) && (
        <p role="alert" className="text-destructive text-sm">
          {problem ?? fieldErrorText(listError)}
        </p>
      )}

      {value.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-muted-foreground text-sm">
          {ti.empty}
        </p>
      ) : (
        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {value.map((image, i) => {
            const asset = previews.get(image.mediaId);
            const altId = `p-img-${i}-alt`;
            const err = altError(i);
            return (
              <li
                key={image.mediaId}
                className="flex gap-3 rounded-md border p-2"
              >
                <div className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-md bg-sunken">
                  {asset && (
                    <MediaImage
                      media={asset}
                      alt={image.alt}
                      sizes="96px"
                      fill
                    />
                  )}
                  {i === 0 && (
                    <Badge className="absolute top-1 left-1">{ti.main}</Badge>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <label htmlFor={altId} className="sr-only">
                    {t.media.alt}
                  </label>
                  <Input
                    id={altId}
                    value={image.alt}
                    maxLength={160}
                    placeholder={t.media.alt}
                    aria-invalid={Boolean(err)}
                    aria-describedby={err ? `${altId}-error` : undefined}
                    onChange={(e) => patch(i, { alt: e.target.value })}
                  />
                  {err && (
                    <p
                      id={`${altId}-error`}
                      className="text-destructive text-xs"
                    >
                      {fieldErrorText(err)}
                    </p>
                  )}
                  <NativeSelect
                    aria-label={ti.color}
                    value={image.colorId ?? ""}
                    onChange={(e) =>
                      patch(i, { colorId: e.target.value || null })
                    }
                  >
                    <option value="">{ti.anyColor}</option>
                    {colors.data?.data.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </NativeSelect>
                  <div className="mt-auto flex flex-wrap gap-1">
                    {i > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={ti.makeMain}
                        title={ti.makeMain}
                        onClick={() => move(i, 0)}
                      >
                        <Star />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={ti.moveUp}
                      disabled={i === 0}
                      onClick={() => move(i, i - 1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={ti.moveDown}
                      disabled={i === value.length - 1}
                      onClick={() => move(i, i + 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={ti.remove}
                      className="ml-auto"
                      onClick={() => onChange(value.filter((_, j) => j !== i))}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <MediaLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        purpose="product"
        selectedId={undefined}
        onSelect={(asset) => {
          add([asset], value);
          setLibraryOpen(false);
        }}
      />
    </div>
  );
}
