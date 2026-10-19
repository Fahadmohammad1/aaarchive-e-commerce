"use client";

import {
  SOCIAL_POST_PLATFORMS,
  type SocialPostInput,
  socialPostInputSchema,
} from "@aaarchive/shared/content";
import type { MediaAsset } from "@aaarchive/shared/media";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { FormField } from "@/components/admin/form-field";
import { ImagePicker } from "@/components/admin/image-picker";
import {
  ListEmpty,
  ListError,
  ListSkeleton,
} from "@/components/admin/list-state";
import { NativeSelect } from "@/components/admin/native-select";
import { PageHeader } from "@/components/admin/page-header";
import { SwitchField } from "@/components/admin/switch-field";
import { useAuth } from "@/components/providers/auth-provider";
import { MediaImage } from "@/components/store/media-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { AdminSocialPost } from "@/lib/content/content-admin-schemas";
import {
  useSocialPostMutations,
  useSocialPosts,
} from "@/lib/content/use-content";
import { errorText } from "@/lib/i18n/error-text";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";

const PLATFORM = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
} as const;
type Values = z.output<typeof socialPostInputSchema>;

/** Content → Social posts (PRD H6): photos uploaded here, no social API. */
export function SocialPostsScreen() {
  const t = getAdminMessages();
  const tc = t.content;
  const { user } = useAuth();
  const canEdit = user?.role === "OWNER";
  const posts = useSocialPosts();
  const { remove } = useSocialPostMutations();
  const [editing, setEditing] = React.useState<AdminSocialPost | null>(null);
  const [open, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<AdminSocialPost | null>(null);

  return (
    <>
      <PageHeader
        title={tc.socialPosts[0]}
        description={canEdit ? tc.socialPosts[1] : t.common.readOnly}
        actions={
          canEdit && (
            <Button
              size="lg"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <Plus />
              {tc.newPost}
            </Button>
          )
        }
      />
      {posts.isPending ? (
        <ListSkeleton />
      ) : posts.isError ? (
        <ListError error={posts.error} onRetry={() => posts.refetch()} />
      ) : posts.data.data.length === 0 ? (
        <ListEmpty />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {posts.data.data.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-2 rounded-md border p-2"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded bg-muted">
                <MediaImage
                  media={p.image.media}
                  alt={p.image.alt}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1 text-sm">
                <span className="font-medium">{p.label}</span>
                <span className="text-muted-foreground text-xs">
                  · {PLATFORM[p.platform]} · #{p.sortOrder}
                </span>
                {!p.isActive && <Badge variant="outline">{tc.hidden}</Badge>}
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`${t.common.edit} ${p.label}`}
                    onClick={() => {
                      setEditing(p);
                      setOpen(true);
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`${t.common.delete} ${p.label}`}
                    onClick={() => setDeleting(p)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <>
          <PostDialog open={open} onOpenChange={setOpen} item={editing} />
          <ConfirmDeleteDialog
            name={deleting?.label ?? null}
            onCancel={() => setDeleting(null)}
            onConfirm={() => remove.mutateAsync(deleting?.id ?? "")}
          />
        </>
      )}
    </>
  );
}

function PostDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item: AdminSocialPost | null;
}) {
  const t = getAdminMessages();
  const tc = t.content;
  const { save } = useSocialPostMutations();
  const [error, setError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<MediaAsset | null>(null);
  const form = useForm<SocialPostInput, unknown, Values>({
    resolver: zodResolver(socialPostInputSchema),
  });
  const { errors, isSubmitting } = form.formState;

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setPreview(item?.image.media ?? null);
    form.reset(
      item
        ? {
            image: { mediaId: item.image.mediaId, alt: item.image.alt },
            label: item.label,
            platform: item.platform,
            link: item.link,
            sortOrder: item.sortOrder,
            isActive: item.isActive,
          }
        : {
            image: undefined as never,
            label: "",
            platform: "INSTAGRAM",
            link: "",
            sortOrder: 0,
            isActive: true,
          },
    );
  }, [open, item, form]);

  const onSubmit = form.handleSubmit(async (body) => {
    setError(null);
    try {
      await save.mutateAsync({ id: item?.id, body });
      onOpenChange(false);
    } catch (e) {
      setError(errorText(e));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{item ? tc.editPost : tc.newPost}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Controller
            control={form.control}
            name="image"
            render={({ field }) => (
              <ImagePicker
                id="post-image"
                label={tc.image}
                purpose="content"
                value={field.value ?? null}
                preview={preview}
                altError={errors.image?.alt?.message ?? errors.image?.message}
                onChange={(v, asset) => {
                  setPreview(asset);
                  field.onChange(v);
                }}
              />
            )}
          />
          <FormField
            id="post-label"
            label={tc.postLabel}
            hint={tc.postLabelHint}
            error={errors.label?.message}
          >
            <Input
              id="post-label"
              maxLength={30}
              className="h-11"
              {...form.register("label")}
            />
          </FormField>
          <FormField id="post-platform" label={tc.platform}>
            <NativeSelect id="post-platform" {...form.register("platform")}>
              {SOCIAL_POST_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM[p]}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField
            id="post-link"
            label={tc.postLink}
            error={errors.link?.message}
          >
            <Input
              id="post-link"
              placeholder="https://"
              className="h-11 font-mono"
              {...form.register("link")}
            />
          </FormField>
          <FormField
            id="post-order"
            label={t.catalog.sortOrder}
            hint={t.catalog.sortOrderHint}
            error={errors.sortOrder?.message}
          >
            <Input
              id="post-order"
              type="number"
              min={0}
              className="h-11 w-28 font-mono"
              {...form.register("sortOrder", { valueAsNumber: true })}
            />
          </FormField>
          <Controller
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <SwitchField
                id="post-active"
                label={t.catalog.active}
                checked={field.value ?? true}
                onCheckedChange={field.onChange}
              />
            )}
          />
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => onOpenChange(false)}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting
                ? t.saving
                : item
                  ? t.common.saveChanges
                  : t.common.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
