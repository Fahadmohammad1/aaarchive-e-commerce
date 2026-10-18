"use client";

import {
  missingVariantPairs,
  PRICE_MAX,
  STOCK_MAX,
  skuSchema,
} from "@aaarchive/shared/product";
import { cn } from "cn";
import { Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { FormField } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api/api-error";
import { useColors } from "@/lib/color/use-colors";
import { errorText, fieldErrorText } from "@/lib/i18n/error-text";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import type { AdminProduct, AdminVariant } from "@/lib/product/product-schemas";
import {
  useDeleteVariant,
  useGenerateVariants,
  useProduct,
  useUpdateVariants,
} from "@/lib/product/use-products";
import { useSizes } from "@/lib/size/use-sizes";

/** Edited cells, as typed (validated on save). */
type Draft = {
  sku?: string;
  stock?: string;
  priceOverride?: string;
  isActive?: boolean;
};

export function VariantsPanel({
  product,
  canEdit,
}: {
  product: AdminProduct;
  canEdit: boolean;
}) {
  const tv = getAdminMessages().products.variants;
  const [generateOpen, setGenerateOpen] = React.useState(
    product.variants.length === 0,
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-prose text-muted-foreground text-sm">{tv.intro}</p>
        {canEdit && !generateOpen && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setGenerateOpen(true)}
          >
            <Plus />
            {tv.generate}
          </Button>
        )}
      </div>
      {canEdit && generateOpen && (
        <GenerateVariants
          product={product}
          onDone={() => setGenerateOpen(false)}
        />
      )}
      {product.variants.length === 0 ? (
        !generateOpen && (
          <p className="rounded-md border border-dashed p-8 text-center text-muted-foreground text-sm">
            {tv.none}
          </p>
        )
      ) : (
        <VariantTable product={product} canEdit={canEdit} />
      )}
    </div>
  );
}

function GenerateVariants({
  product,
  onDone,
}: {
  product: AdminProduct;
  onDone: () => void;
}) {
  const t = getAdminMessages();
  const tv = t.products.variants;
  const sizes = useSizes();
  const colors = useColors();
  const generate = useGenerateVariants(product.id);
  const [sizeIds, setSizeIds] = React.useState<string[]>([]);
  const [colorIds, setColorIds] = React.useState<string[]>([]);
  const [stock, setStock] = React.useState("0");
  const [problem, setProblem] = React.useState<string | null>(null);
  const count = missingVariantPairs(sizeIds, colorIds, product.variants).length;
  const stockNumber = Number(stock);
  const stockValid =
    Number.isInteger(stockNumber) &&
    stockNumber >= 0 &&
    stockNumber <= STOCK_MAX;

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const submit = async () => {
    setProblem(null);
    try {
      await generate.mutateAsync({ sizeIds, colorIds, stock: stockNumber });
      setSizeIds([]);
      setColorIds([]);
      onDone();
    } catch (error) {
      setProblem(errorText(error));
    }
  };

  return (
    <section
      aria-labelledby="gen-title"
      className="flex flex-col gap-4 rounded-md border p-4"
    >
      <div>
        <h2 id="gen-title" className="font-medium">
          {tv.generate}
        </h2>
        <p className="text-muted-foreground text-xs">{tv.generateHint}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-medium text-sm">{tv.sizes}</legend>
          {sizes.data?.data.length === 0 && (
            <p className="text-muted-foreground text-xs">{tv.noSizes}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {sizes.data?.data.map((s) => (
              <ChipCheckbox
                key={s.id}
                label={s.name}
                checked={sizeIds.includes(s.id)}
                onChange={() => setSizeIds((l) => toggle(l, s.id))}
                mono
              />
            ))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-medium text-sm">{tv.colors}</legend>
          {colors.data?.data.length === 0 && (
            <p className="text-muted-foreground text-xs">{tv.noColors}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {colors.data?.data.map((c) => (
              <ChipCheckbox
                key={c.id}
                label={c.name}
                swatch={c.hex}
                checked={colorIds.includes(c.id)}
                onChange={() => setColorIds((l) => toggle(l, c.id))}
              />
            ))}
          </div>
        </fieldset>
      </div>
      <FormField
        id="gen-stock"
        label={tv.startingStock}
        error={stockValid ? undefined : "INVALID"}
      >
        <Input
          id="gen-stock"
          type="number"
          inputMode="numeric"
          min={0}
          max={STOCK_MAX}
          className="w-28 font-mono"
          value={stock}
          aria-invalid={!stockValid}
          onChange={(e) => setStock(e.target.value)}
        />
      </FormField>
      {problem && (
        <p role="alert" className="text-destructive text-sm">
          {problem}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="lg"
          disabled={count === 0 || !stockValid || generate.isPending}
          onClick={() => void submit()}
        >
          {generate.isPending ? t.saving : format(tv.create, { count })}
        </Button>
        {product.variants.length > 0 && (
          <Button type="button" variant="ghost" size="lg" onClick={onDone}>
            {t.common.cancel}
          </Button>
        )}
      </div>
    </section>
  );
}

/** A 44px-tall toggle chip backed by a real checkbox. */
function ChipCheckbox({
  label,
  checked,
  onChange,
  swatch,
  mono,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  swatch?: string;
  mono?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
        checked && "border-primary bg-primary/10",
        mono && "font-mono",
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={onChange}
      />
      {swatch && (
        <span
          aria-hidden
          className="size-4 rounded-full border"
          style={{ backgroundColor: swatch }}
        />
      )}
      {label}
    </label>
  );
}

function VariantTable({
  product,
  canEdit,
}: {
  product: AdminProduct;
  canEdit: boolean;
}) {
  const t = getAdminMessages();
  const tv = t.products.variants;
  const update = useUpdateVariants(product.id);
  const remove = useDeleteVariant(product.id);
  const detail = useProduct(product.id);
  const [drafts, setDrafts] = React.useState<Record<string, Draft>>({});
  const [problem, setProblem] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const changed = product.variants.filter((v) => isChanged(v, drafts[v.id]));
  const invalid = changed.some((v) => cellErrors(drafts[v.id]).size > 0);

  const edit = (id: string, patch: Draft) => {
    setNotice(null);
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  };

  const save = async () => {
    setProblem(null);
    setNotice(null);
    try {
      await update.mutateAsync({
        variants: changed.map((v) => toUpdate(v, drafts[v.id] ?? {})),
      });
      setDrafts({});
      setNotice(tv.saved);
    } catch (error) {
      if (ApiError.isApiError(error) && error.code === "STOCK_CHANGED") {
        // Show the real numbers; the owner's edits stay so they can re-check.
        await detail.refetch();
        setProblem(tv.stockChanged);
      } else {
        setProblem(errorText(error));
      }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t.products.columns.variants}</TableHead>
            <TableHead className="hidden sm:table-cell">{tv.sku}</TableHead>
            <TableHead className="text-right">{tv.stock}</TableHead>
            <TableHead className="hidden text-right md:table-cell">
              {tv.priceOverride}
            </TableHead>
            <TableHead className="text-center">{tv.active}</TableHead>
            {canEdit && (
              <TableHead className="hidden sm:table-cell">
                <span className="sr-only">{t.common.actions}</span>
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {product.variants.map((v) => {
            const draft = drafts[v.id] ?? {};
            const errors = cellErrors(draft);
            const name = `${v.colorName} / ${v.sizeName}`;
            const stockValue = draft.stock ?? String(v.stock);
            const stockNumber = Number(stockValue);
            const stockTone =
              stockNumber <= 0
                ? "text-destructive"
                : v.stockStatus === "low_stock" && draft.stock === undefined
                  ? "text-primary"
                  : "";
            return (
              <TableRow
                key={v.id}
                className={cn(
                  "h-12",
                  !(draft.isActive ?? v.isActive) && "text-muted-foreground",
                )}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-4 shrink-0 rounded-full border"
                      style={{ backgroundColor: v.colorHex }}
                    />
                    <span className="flex min-w-0 flex-col">
                      <span>
                        {v.colorName}{" "}
                        <span className="font-medium font-mono">
                          {v.sizeName}
                        </span>
                      </span>
                      <span className="block max-w-[7.5rem] truncate font-mono text-muted-foreground text-xs sm:hidden">
                        {v.sku}
                      </span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  {canEdit ? (
                    <Input
                      value={draft.sku ?? v.sku}
                      maxLength={40}
                      aria-label={`${tv.sku} ${name}`}
                      aria-invalid={errors.has("sku")}
                      title={
                        errors.has("sku")
                          ? fieldErrorText(errors.get("sku"))
                          : undefined
                      }
                      className="w-full min-w-44 max-w-72 font-mono uppercase"
                      onChange={(e) => edit(v.id, { sku: e.target.value })}
                    />
                  ) : (
                    <span className="font-mono">{v.sku}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {canEdit ? (
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={STOCK_MAX}
                      value={stockValue}
                      aria-label={`${tv.stock} ${name}`}
                      aria-invalid={errors.has("stock")}
                      className={cn(
                        "ml-auto w-20 text-right font-mono",
                        stockTone,
                      )}
                      onChange={(e) => edit(v.id, { stock: e.target.value })}
                    />
                  ) : (
                    <span className={cn("font-mono", stockTone)}>
                      {v.stock}
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden text-right md:table-cell">
                  {canEdit ? (
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={PRICE_MAX}
                      value={
                        draft.priceOverride ??
                        (v.priceOverride == null ? "" : String(v.priceOverride))
                      }
                      placeholder={String(product.basePrice)}
                      title={tv.priceOverrideHint}
                      aria-label={`${tv.priceOverride} ${name}`}
                      aria-invalid={errors.has("priceOverride")}
                      className="ml-auto w-32 text-right font-mono"
                      onChange={(e) =>
                        edit(v.id, { priceOverride: e.target.value })
                      }
                    />
                  ) : (
                    <span className="font-mono">{v.priceOverride ?? "—"}</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={draft.isActive ?? v.isActive}
                    disabled={!canEdit}
                    aria-label={`${tv.active} ${name}`}
                    onCheckedChange={(checked) =>
                      edit(v.id, { isActive: checked })
                    }
                  />
                </TableCell>
                {canEdit && (
                  // Phones keep stock + on/off; deleting waits for a bigger screen.
                  <TableCell className="hidden text-right sm:table-cell">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-lg"
                      disabled={v.hasOrders || remove.isPending}
                      title={v.hasOrders ? tv.hasOrders : undefined}
                      aria-label={format(tv.deleteVariant, { name })}
                      onClick={() => {
                        setProblem(null);
                        remove.mutate(v.id, {
                          onError: (error) => setProblem(errorText(error)),
                        });
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {problem && (
        <p role="alert" className="text-destructive text-sm">
          {problem}
        </p>
      )}
      {notice && (
        <p role="status" className="text-success text-sm">
          {notice}
        </p>
      )}
      {canEdit && changed.length > 0 && (
        // Sticky on phones so "Save stock" stays reachable in a long table.
        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 border-t bg-background/95 px-1 py-3 backdrop-blur">
          <Button
            type="button"
            size="lg"
            disabled={invalid || update.isPending}
            onClick={() => void save()}
          >
            {update.isPending ? t.saving : tv.saveStock}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={() => {
              setDrafts({});
              setProblem(null);
            }}
          >
            {tv.discard}
          </Button>
          <span className="text-muted-foreground text-xs" aria-live="polite">
            {format(tv.unsaved, { count: changed.length })}
          </span>
        </div>
      )}
    </div>
  );
}

function isChanged(v: AdminVariant, d: Draft | undefined): boolean {
  if (!d) return false;
  return (
    (d.sku !== undefined && d.sku.trim().toUpperCase() !== v.sku) ||
    (d.stock !== undefined && Number(d.stock) !== v.stock) ||
    (d.priceOverride !== undefined &&
      (d.priceOverride.trim() === "" ? null : Number(d.priceOverride)) !==
        v.priceOverride) ||
    (d.isActive !== undefined && d.isActive !== v.isActive)
  );
}

/** Field → error code, for the cells the owner typed into. */
function cellErrors(d: Draft | undefined) {
  const errors = new Map<keyof Draft, string>();
  if (!d) return errors;
  if (d.sku !== undefined) {
    const r = skuSchema.safeParse(d.sku);
    if (!r.success) errors.set("sku", r.error.issues[0]?.message ?? "INVALID");
  }
  if (d.stock !== undefined) {
    const n = Number(d.stock);
    if (
      d.stock.trim() === "" ||
      !Number.isInteger(n) ||
      n < 0 ||
      n > STOCK_MAX
    ) {
      errors.set("stock", "INVALID");
    }
  }
  if (d.priceOverride !== undefined && d.priceOverride.trim() !== "") {
    const n = Number(d.priceOverride);
    if (!Number.isInteger(n) || n < 1 || n > PRICE_MAX) {
      errors.set("priceOverride", "WHOLE_TAKA");
    }
  }
  return errors;
}

function toUpdate(v: AdminVariant, d: Draft) {
  const stock = d.stock !== undefined ? Number(d.stock) : undefined;
  return {
    id: v.id,
    ...(d.sku !== undefined && { sku: d.sku }),
    ...(stock !== undefined &&
      stock !== v.stock && {
        stock,
        // Refuse instead of overwriting an order placed since the page loaded.
        expectedStock: v.stock,
      }),
    ...(d.priceOverride !== undefined && {
      priceOverride:
        d.priceOverride.trim() === "" ? null : Number(d.priceOverride),
    }),
    ...(d.isActive !== undefined && { isActive: d.isActive }),
  };
}
