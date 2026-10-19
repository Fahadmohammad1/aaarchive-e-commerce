"use client";

import {
  type PageInput,
  pageInputSchema,
  pagePath,
} from "@aaarchive/shared/content";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { FormField } from "@/components/admin/form-field";
import { ListError, ListSkeleton } from "@/components/admin/list-state";
import { PageHeader } from "@/components/admin/page-header";
import { useAuth } from "@/components/providers/auth-provider";
import { RichText } from "@/components/store/rich-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/api-error";
import type { AdminPage } from "@/lib/content/content-admin-schemas";
import { usePage, usePageMutations } from "@/lib/content/use-content";
import { errorText } from "@/lib/i18n/error-text";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";

type Values = z.output<typeof pageInputSchema>;

export function PageEditorRoute() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const page = usePage(isNew ? null : id);
  if (!isNew && page.isPending) return <ListSkeleton rows={6} />;
  if (!isNew && page.isError)
    return <ListError error={page.error} onRetry={() => page.refetch()} />;
  return <PageEditor key={page.data?.id ?? "new"} page={page.data ?? null} />;
}

/** One content page: Markdown-lite text with a live preview (user decision 2026-10-19). */
function PageEditor({ page }: { page: AdminPage | null }) {
  const t = getAdminMessages();
  const tc = t.content;
  const router = useRouter();
  const { user } = useAuth();
  const canEdit = user?.role === "OWNER";
  const { save, remove } = usePageMutations();
  const [message, setMessage] = React.useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const form = useForm<PageInput, unknown, Values>({
    resolver: zodResolver(pageInputSchema),
    defaultValues: page
      ? {
          slug: page.slug,
          title: page.title,
          content: page.content,
          seoTitle: page.seoTitle,
          seoDesc: page.seoDesc,
        }
      : { slug: "", title: "", content: "", seoTitle: null, seoDesc: null },
  });
  const { errors, isSubmitting } = form.formState;
  const content = form.watch("content");
  const slug = form.watch("slug");

  const onSubmit = form.handleSubmit(async (body) => {
    setMessage(null);
    try {
      const saved = (await save.mutateAsync({
        id: page?.id,
        body,
      })) as AdminPage;
      setMessage({ ok: true, text: tc.saved });
      if (!page) router.replace(`/admin/content/pages/${saved.id}`);
    } catch (e) {
      if (ApiError.isApiError(e) && e.code === "SLUG_TAKEN")
        form.setError("slug", { message: "SLUG_TAKEN" });
      setMessage({ ok: false, text: errorText(e) });
    }
  });

  return (
    <>
      <Link
        href="/admin/content/pages"
        className="mb-2 flex min-h-11 w-fit items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {tc.pages[0]}
      </Link>
      <PageHeader
        title={page?.title ?? tc.newPage}
        description={slug ? pagePath(slug) : undefined}
        actions={
          canEdit &&
          page && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setDeleting(true)}
            >
              <Trash2 />
              {t.common.delete}
            </Button>
          )
        }
      />
      <form
        onSubmit={onSubmit}
        noValidate
        className="grid gap-6 lg:grid-cols-2"
      >
        <fieldset disabled={!canEdit} className="flex flex-col gap-4">
          <FormField
            id="pg-title"
            label={tc.pageTitle}
            error={errors.title?.message}
          >
            <Input
              id="pg-title"
              maxLength={80}
              className="h-11"
              {...form.register("title")}
            />
          </FormField>
          <FormField
            id="pg-slug"
            label={tc.pageSlug}
            hint={tc.pageSlugHint}
            error={errors.slug?.message}
          >
            <Input
              id="pg-slug"
              maxLength={60}
              className="h-11 font-mono"
              {...form.register("slug")}
            />
          </FormField>
          <FormField
            id="pg-content"
            label={tc.pageContent}
            hint={tc.pageContentHint}
            error={errors.content?.message}
          >
            <Textarea
              id="pg-content"
              rows={18}
              maxLength={20000}
              className="font-mono text-sm"
              {...form.register("content")}
            />
          </FormField>
          <FormField
            id="pg-seo-title"
            label={tc.seoTitle}
            error={errors.seoTitle?.message}
          >
            <Input
              id="pg-seo-title"
              maxLength={70}
              className="h-11"
              {...form.register("seoTitle")}
            />
          </FormField>
          <FormField
            id="pg-seo-desc"
            label={tc.seoDesc}
            error={errors.seoDesc?.message}
          >
            <Textarea
              id="pg-seo-desc"
              rows={2}
              maxLength={160}
              {...form.register("seoDesc")}
            />
          </FormField>
          {canEdit && (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? t.saving : t.save}
              </Button>
              {message && (
                <span
                  role={message.ok ? "status" : "alert"}
                  className={
                    message.ok
                      ? "text-sm text-success"
                      : "text-destructive text-sm"
                  }
                >
                  {message.text}
                </span>
              )}
            </div>
          )}
        </fieldset>
        <section aria-label={tc.preview} className="flex flex-col gap-2">
          <h2 className="font-medium text-muted-foreground text-sm">
            {tc.preview}
          </h2>
          <div className="rounded-md border p-4">
            <RichText source={content} className="text-sm" />
          </div>
        </section>
      </form>
      {page && (
        <ConfirmDeleteDialog
          name={deleting ? page.title : null}
          onCancel={() => setDeleting(false)}
          onConfirm={async () => {
            await remove.mutateAsync(page.id);
            router.replace("/admin/content/pages");
          }}
        />
      )}
    </>
  );
}
