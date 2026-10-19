"use client";

import type { MediaAsset } from "@aaarchive/shared/media";
import { cn } from "cn";
import { Crosshair, Search, Trash2 } from "lucide-react";
import * as React from "react";
import {
  type FieldValues,
  type UseFormReturn,
  useFieldArray,
} from "react-hook-form";
import { MediaImage } from "@/components/store/media-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { useProducts } from "@/lib/product/use-products";
import { errorAt, HeadingLinesField, ImageField, TextField } from "../fields";
import { SectionShell } from "../section-shell";
import { useSectionForm } from "../use-section-form";
import type { SectionFormProps } from "./types";

type F = UseFormReturn<FieldValues>;
type Item = {
  productId: string;
  code?: string;
  hotspot: { x: number; y: number };
};

/**
 * Look file (PRD H3): pick up to 6 products, then click the photo to place
 * each one's numbered hotspot (stored as % from the top-left).
 */
export function LookFileForm({
  initial,
  media,
  products,
  canEdit,
}: SectionFormProps) {
  const t = getAdminMessages().content;
  const { form, submit, saving, message } = useSectionForm(
    "home.lookFile",
    initial,
    {
      heading: [""],
      label: "",
      intro: "",
      image: null,
      href: "/shop",
      items: [],
    },
  );
  const items = useFieldArray({ control: form.control, name: "items" });
  const [names, setNames] = React.useState<
    Record<string, { name: string; status: string }>
  >(() =>
    Object.fromEntries(Object.entries(products).map(([id, p]) => [id, p])),
  );
  const [placing, setPlacing] = React.useState<number | null>(null);
  const [preview, setPreview] = React.useState<MediaAsset | null>(null);
  const image = form.watch("image") as { mediaId: string; alt: string } | null;
  const asset = preview ?? (image ? (media[image.mediaId] ?? null) : null);
  const current = (form.watch("items") as Item[] | undefined) ?? [];

  const place = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (placing === null) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x =
      Math.round(((event.clientX - rect.left) / rect.width) * 1000) / 10;
    const y =
      Math.round(((event.clientY - rect.top) / rect.height) * 1000) / 10;
    form.setValue(`items.${placing}.hotspot`, { x, y }, { shouldDirty: true });
    setPlacing(null);
  };

  return (
    <SectionShell
      canEdit={canEdit}
      saving={saving}
      message={message}
      onSubmit={submit}
    >
      <HeadingLinesField form={form as F} name="heading" label={t.heading} />
      <TextField
        form={form as F}
        name="label"
        id="lf-label"
        label={t.lookLabel}
        maxLength={40}
      />
      <TextField
        form={form as F}
        name="intro"
        id="lf-intro"
        label={t.intro}
        maxLength={240}
        textarea
      />
      <ImageField
        control={form.control}
        name="image"
        id="lf-image"
        label={t.image}
        media={media}
        error={errorAt(form as F, "image.alt") ?? errorAt(form as F, "image")}
        onPreview={setPreview}
      />
      <TextField
        form={form as F}
        name="href"
        id="lf-href"
        label={t.lookHref}
        hint={t.hrefHint}
        maxLength={300}
        mono
      />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-medium text-sm">{t.pieces}</legend>
        <p className="text-muted-foreground text-xs">{t.piecesHint}</p>
        {asset && (
          <div className="relative w-full max-w-md">
            <button
              type="button"
              onClick={place}
              aria-label={
                placing !== null
                  ? format(t.placing, { index: placing + 1 })
                  : t.image
              }
              className={cn(
                "relative block aspect-[4/5] w-full overflow-hidden rounded-md bg-muted",
                placing !== null
                  ? "cursor-crosshair ring-2 ring-primary"
                  : "cursor-default",
              )}
            >
              <MediaImage
                media={asset}
                alt=""
                fill
                sizes="28rem"
                className="object-cover"
              />
              {current.map((item, i) => (
                <span
                  key={item.productId}
                  aria-hidden
                  style={{
                    left: `${item.hotspot.x}%`,
                    top: `${item.hotspot.y}%`,
                  }}
                  className="absolute grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center bg-primary font-mono text-primary-foreground text-xs"
                >
                  {i + 1}
                </span>
              ))}
            </button>
            {placing !== null && (
              <p role="status" className="mt-2 text-primary text-sm">
                {format(t.placing, { index: placing + 1 })}
              </p>
            )}
          </div>
        )}
        <ol className="flex flex-col gap-2">
          {items.fields.map((field, i) => {
            const productId = current[i]?.productId ?? "";
            const info = names[productId];
            return (
              <li
                key={field.id}
                className="flex flex-wrap items-center gap-2 rounded-md border p-2"
              >
                <span className="grid size-7 shrink-0 place-items-center bg-primary font-mono text-primary-foreground text-xs">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  {info?.name ?? productId}
                  {info && info.status !== "PUBLISHED" && (
                    <Badge variant="outline" className="ml-2">
                      {t.unpublished}
                    </Badge>
                  )}
                </span>
                <Input
                  aria-label={t.pieceCode}
                  placeholder={t.pieceCode}
                  maxLength={20}
                  className="h-9 w-32 font-mono"
                  {...form.register(`items.${i}.code`, {
                    setValueAs: (v: string) =>
                      v?.trim() ? v.trim() : undefined,
                  })}
                />
                <Button
                  type="button"
                  variant={placing === i ? "default" : "outline"}
                  size="sm"
                  disabled={!asset}
                  onClick={() => setPlacing(placing === i ? null : i)}
                >
                  <Crosshair />
                  {t.place}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-lg"
                  aria-label={format(t.removePiece, { index: i + 1 })}
                  onClick={() => items.remove(i)}
                >
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ol>
        {errorAt(form as F, "items") && (
          <p className="text-destructive text-xs">{t.piecesHint}</p>
        )}
        {items.fields.length < 6 && (
          <ProductAdder
            exclude={current.map((c) => c.productId)}
            onAdd={(p) => {
              setNames((n) => ({
                ...n,
                [p.id]: { name: p.name, status: p.status },
              }));
              items.append({ productId: p.id, hotspot: { x: 50, y: 50 } });
              if (asset) setPlacing(items.fields.length);
            }}
          />
        )}
      </fieldset>
    </SectionShell>
  );
}

function ProductAdder({
  exclude,
  onAdd,
}: {
  exclude: string[];
  onAdd: (p: { id: string; name: string; status: string }) => void;
}) {
  const t = getAdminMessages().content;
  const [q, setQ] = React.useState("");
  const list = useProducts({
    q: q.trim() || undefined,
    status: "PUBLISHED",
    limit: 8,
  });
  return (
    <div className="flex flex-col gap-1 rounded-md border border-dashed p-2">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.addPiece}
          aria-label={t.addPiece}
          className="h-11 pl-8"
        />
      </div>
      {q.trim() && (
        <ul>
          {list.data?.data
            .filter((p) => !exclude.includes(p.id))
            .map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="min-h-11 w-full rounded px-2 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    onAdd({ id: p.id, name: p.name, status: p.status });
                    setQ("");
                  }}
                >
                  {p.name}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
