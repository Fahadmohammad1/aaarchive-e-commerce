"use client";

import type { MediaAsset } from "@aaarchive/shared/media";
import {
  type ProductValues,
  productInputSchema,
} from "@aaarchive/shared/product";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { ListError, ListSkeleton } from "@/components/admin/list-state";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError } from "@/lib/api/api-error";
import { errorText } from "@/lib/i18n/error-text";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import type { AdminProduct } from "@/lib/product/product-schemas";
import {
  useCreateProduct,
  useDeleteProduct,
  useDuplicateProduct,
  useProduct,
  useUpdateProduct,
} from "@/lib/product/use-products";
import { DetailsTab } from "./details-tab";
import { ImagesTab } from "./images-tab";
import { PricingTab } from "./pricing-tab";
import {
  blankProduct,
  FIELD_TAB,
  PRODUCT_TABS,
  type ProductFormValues,
  type ProductTab,
  toFormValues,
} from "./product-form-values";
import { ProductStatusBadge } from "./product-status-badge";
import { SeoTab } from "./seo-tab";
import { SizeChartTab } from "./size-chart-tab";
import { VariantsPanel } from "./variants-panel";

/** `/admin/products/new` (id null) and `/admin/products/[id]`. */
export function ProductEditor({ id }: { id: string | null }) {
  const t = getAdminMessages().products;
  const product = useProduct(id);
  if (!id) return <ProductForm product={null} />;
  if (product.isPending) return <ListSkeleton rows={8} />;
  if (product.isError) {
    return (
      <>
        <BackLink />
        <p className="mb-3 font-medium">{t.loadFailed}</p>
        <ListError error={product.error} onRetry={() => product.refetch()} />
      </>
    );
  }
  // Remount per product so the form starts from that product's values.
  return <ProductForm key={product.data.id} product={product.data} />;
}

function BackLink() {
  return (
    <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2">
      <Link href="/admin/products">
        <ArrowLeft />
        {getAdminMessages().products.back}
      </Link>
    </Button>
  );
}

function firstTabWithError(errors: FieldErrors): ProductTab | undefined {
  const tabs = new Set(Object.keys(errors).map((f) => FIELD_TAB[f]));
  return PRODUCT_TABS.find((tab) => tabs.has(tab));
}

function ProductForm({ product }: { product: AdminProduct | null }) {
  const t = getAdminMessages();
  const tp = t.products;
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();
  const canEdit = user?.role === "OWNER";
  const create = useCreateProduct();
  const update = useUpdateProduct(product?.id ?? "");
  const duplicate = useDuplicateProduct();
  const remove = useDeleteProduct();

  const initialTab = params.get("tab") as ProductTab | null;
  const [tab, setTab] = React.useState<ProductTab>(
    initialTab && PRODUCT_TABS.includes(initialTab) ? initialTab : "details",
  );
  const [formError, setFormError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(
    initialTab === "variants" && product?.variants.length === 0
      ? tp.created
      : null,
  );
  const [deleting, setDeleting] = React.useState(false);
  const [previews, setPreviews] = React.useState(
    () => new Map(product?.images.map((i) => [i.mediaId, i.media]) ?? []),
  );
  const addPreview = React.useCallback((asset: MediaAsset) => {
    setPreviews((m) => (m.has(asset.id) ? m : new Map(m).set(asset.id, asset)));
  }, []);

  const form = useForm<ProductFormValues, unknown, ProductValues>({
    resolver: zodResolver(productInputSchema),
    defaultValues: product ? toFormValues(product) : blankProduct(),
  });
  const { errors, isSubmitting, isDirty } = form.formState;
  const errorTabs = new Set(Object.keys(errors).map((f) => FIELD_TAB[f]));

  const onSubmit = form.handleSubmit(
    async (values) => {
      setFormError(null);
      setNotice(null);
      try {
        if (product) {
          const saved = await update.mutateAsync(values);
          form.reset(toFormValues(saved));
          setNotice(tp.saved);
        } else {
          const saved = await create.mutateAsync(values);
          router.replace(`/admin/products/${saved.id}?tab=variants`);
        }
      } catch (error) {
        const field =
          ApiError.isApiError(error) &&
          ((error.details as { field?: string } | null)?.field ??
            (error.code === "SLUG_TAKEN" ? "slug" : undefined));
        if (ApiError.isApiError(error) && field && field in FIELD_TAB) {
          form.setError(field as keyof ProductFormValues, {
            message: error.code,
          });
          setTab(FIELD_TAB[field] ?? "details");
          setFormError(errorText(error));
        } else {
          setFormError(errorText(error));
        }
      }
    },
    (invalid) => {
      const first = firstTabWithError(invalid);
      if (first) setTab(first);
    },
  );

  const title = product?.name ?? tp.newProduct;

  return (
    <>
      <BackLink />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="truncate font-semibold text-2xl">{title}</h1>
          {product && (
            <div className="flex items-center gap-2">
              <ProductStatusBadge status={product.status} />
              <span className="font-mono text-muted-foreground text-xs">
                /{product.slug}
              </span>
            </div>
          )}
          {!canEdit && (
            <p className="text-muted-foreground text-sm">{t.common.readOnly}</p>
          )}
        </div>
        {canEdit && (
          <div className="flex shrink-0 gap-2">
            {tab !== "variants" && (
              <Button
                type="submit"
                form="product-form"
                size="lg"
                disabled={isSubmitting || (product !== null && !isDirty)}
              >
                {isSubmitting ? t.saving : tp.save}
              </Button>
            )}
            {product && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-lg"
                    aria-label={tp.moreActions}
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    disabled={duplicate.isPending}
                    onSelect={() =>
                      duplicate.mutate(product.id, {
                        onSuccess: (copy) =>
                          router.push(`/admin/products/${copy.id}`),
                        onError: (e) => setFormError(errorText(e)),
                      })
                    }
                  >
                    <Copy />
                    {tp.duplicate}
                  </DropdownMenuItem>
                  {product.status === "PUBLISHED" && (
                    <DropdownMenuItem asChild>
                      <a
                        href={`/product/${product.slug}`}
                        target="_blank"
                        rel="noopener"
                      >
                        <ExternalLink />
                        {tp.viewInStore}
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setDeleting(true)}
                  >
                    <Trash2 />
                    {tp.deleteProduct}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>

      {(formError || notice) && (
        <p
          role={formError ? "alert" : "status"}
          className={
            formError
              ? "mb-4 text-destructive text-sm"
              : "mb-4 text-success text-sm"
          }
        >
          {formError ?? notice}
        </p>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as ProductTab)}>
        {/* Scrolls sideways on phones instead of wrapping. */}
        <div className="-mx-4 mb-5 overflow-x-auto px-4 md:mx-0 md:px-0">
          <TabsList variant="line" className="h-10">
            {PRODUCT_TABS.map((key) => (
              <TabsTrigger
                key={key}
                value={key}
                disabled={key === "variants" && !product}
                className="px-3"
              >
                {tp.tabs[key]}
                {errorTabs.has(key) && (
                  <>
                    <span
                      aria-hidden
                      className="size-1.5 rounded-full bg-destructive"
                    />
                    <span className="sr-only">({tp.tabHasErrors})</span>
                  </>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <form id="product-form" onSubmit={onSubmit} noValidate>
          {/* Staff see every field, but cannot change anything. */}
          <fieldset disabled={!canEdit} className="min-w-0">
            <TabsContent value="details">
              <DetailsTab form={form} />
            </TabsContent>
            <TabsContent value="pricing">
              <PricingTab form={form} />
            </TabsContent>
            <TabsContent value="images">
              <ImagesTab
                form={form}
                previews={previews}
                onPreview={addPreview}
              />
            </TabsContent>
            <TabsContent value="sizeChart">
              <SizeChartTab form={form} />
            </TabsContent>
            <TabsContent value="seo">
              <SeoTab form={form} />
            </TabsContent>
          </fieldset>
        </form>

        <TabsContent value="variants">
          {product ? (
            <VariantsPanel product={product} canEdit={canEdit} />
          ) : (
            <p className="text-muted-foreground text-sm">
              {tp.variants.saveFirst}
            </p>
          )}
        </TabsContent>
      </Tabs>

      {product && canEdit && (
        <ConfirmDeleteDialog
          name={deleting ? product.name : null}
          onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            await remove.mutateAsync(product.id);
            router.replace("/admin/products");
          }}
        />
      )}
    </>
  );
}
