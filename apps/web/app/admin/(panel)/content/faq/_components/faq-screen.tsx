"use client";

import { type FaqInput, faqInputSchema } from "@aaarchive/shared/content";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { ConfirmDeleteDialog } from "@/components/admin/confirm-delete-dialog";
import { FormField } from "@/components/admin/form-field";
import {
  ListEmpty,
  ListError,
  ListSkeleton,
} from "@/components/admin/list-state";
import { PageHeader } from "@/components/admin/page-header";
import { SwitchField } from "@/components/admin/switch-field";
import { useAuth } from "@/components/providers/auth-provider";
import { RichText } from "@/components/store/rich-text";
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
import { Textarea } from "@/components/ui/textarea";
import type { AdminFaq } from "@/lib/content/content-admin-schemas";
import { useFaq, useFaqMutations } from "@/lib/content/use-content";
import { errorText } from "@/lib/i18n/error-text";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";

type Values = z.output<typeof faqInputSchema>;

/** Content → FAQ (PRD §5.11). */
export function FaqScreen() {
  const t = getAdminMessages();
  const tc = t.content;
  const { user } = useAuth();
  const canEdit = user?.role === "OWNER";
  const faq = useFaq();
  const { remove } = useFaqMutations();
  const [editing, setEditing] = React.useState<AdminFaq | null>(null);
  const [open, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<AdminFaq | null>(null);

  return (
    <>
      <PageHeader
        title={tc.faq[0]}
        description={canEdit ? tc.faq[1] : t.common.readOnly}
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
              {tc.newQuestion}
            </Button>
          )
        }
      />
      {faq.isPending ? (
        <ListSkeleton />
      ) : faq.isError ? (
        <ListError error={faq.error} onRetry={() => faq.refetch()} />
      ) : faq.data.data.length === 0 ? (
        <ListEmpty />
      ) : (
        <ul className="flex max-w-3xl flex-col gap-2">
          {faq.data.data.map((f) => (
            <li
              key={f.id}
              className="flex items-start justify-between gap-3 rounded-md border p-3"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  <span className="font-mono text-muted-foreground text-xs">
                    #{f.sortOrder}
                  </span>
                  {f.question}
                  {!f.isActive && <Badge variant="outline">{tc.hidden}</Badge>}
                </p>
                <RichText
                  source={f.answer}
                  className="mt-1 text-muted-foreground text-sm"
                />
              </div>
              {canEdit && (
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`${t.common.edit}: ${f.question}`}
                    onClick={() => {
                      setEditing(f);
                      setOpen(true);
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`${t.common.delete}: ${f.question}`}
                    onClick={() => setDeleting(f)}
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
          <FaqDialog open={open} onOpenChange={setOpen} item={editing} />
          <ConfirmDeleteDialog
            name={deleting?.question ?? null}
            onCancel={() => setDeleting(null)}
            onConfirm={() => remove.mutateAsync(deleting?.id ?? "")}
          />
        </>
      )}
    </>
  );
}

function FaqDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item: AdminFaq | null;
}) {
  const t = getAdminMessages();
  const tc = t.content;
  const { save } = useFaqMutations();
  const [error, setError] = React.useState<string | null>(null);
  const form = useForm<FaqInput, unknown, Values>({
    resolver: zodResolver(faqInputSchema),
  });
  const { errors, isSubmitting } = form.formState;

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    form.reset(
      item
        ? {
            question: item.question,
            answer: item.answer,
            sortOrder: item.sortOrder,
            isActive: item.isActive,
          }
        : { question: "", answer: "", sortOrder: 0, isActive: true },
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? tc.editQuestion : tc.newQuestion}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormField
            id="faq-q"
            label={tc.question}
            error={errors.question?.message}
          >
            <Input
              id="faq-q"
              maxLength={200}
              className="h-11"
              {...form.register("question")}
            />
          </FormField>
          <FormField
            id="faq-a"
            label={tc.answer}
            hint={tc.pageContentHint}
            error={errors.answer?.message}
          >
            <Textarea
              id="faq-a"
              rows={6}
              maxLength={4000}
              {...form.register("answer")}
            />
          </FormField>
          <FormField
            id="faq-order"
            label={tc.order}
            hint={t.catalog.sortOrderHint}
            error={errors.sortOrder?.message}
          >
            <Input
              id="faq-order"
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
                id="faq-active"
                label={tc.visible}
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
