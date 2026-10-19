"use client";

import type { ContentKey } from "@aaarchive/shared/content";
import { contentSchemas } from "@aaarchive/shared/content";
import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { useSaveContent } from "@/lib/content/use-content";
import { errorText } from "@/lib/i18n/error-text";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";

/**
 * One section form: validated with the same `contentSchemas[key]` the API
 * uses (PRD §6.7 rule 1), so the store can always render what is saved.
 */
export function useSectionForm(
  key: ContentKey,
  initial: unknown,
  defaults: FieldValues,
  /** Tidies form values before validation (e.g. drops empty photo slots). */
  prepare: (values: FieldValues) => FieldValues = (v) => v,
) {
  const t = getAdminMessages().content;
  const save = useSaveContent();
  const [message, setMessage] = React.useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  // The schema of this key; widened because the registry is a union.
  const resolve = zodResolver(contentSchemas[key] as never);
  const form = useForm<FieldValues>({
    resolver: (values, context, options) =>
      resolve(prepare(values) as never, context, options as never) as never,
    defaultValues: (initial as FieldValues | null) ?? defaults,
  });

  const submit = form.handleSubmit(async (data) => {
    setMessage(null);
    try {
      await save.mutateAsync({ key, data });
      form.reset(data);
      setMessage({ ok: true, text: t.saved });
    } catch (error) {
      setMessage({ ok: false, text: errorText(error) });
    }
  });

  return { form, submit, saving: save.isPending, message };
}
