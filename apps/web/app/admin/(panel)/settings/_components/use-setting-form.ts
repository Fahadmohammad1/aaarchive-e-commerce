"use client";

import { type SettingKey, settingSchemas } from "@aaarchive/shared/settings";
import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { errorText } from "@/lib/i18n/error-text";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { useSaveSetting } from "@/lib/settings/use-admin-settings";

/** A settings tab validated with the same schema the API uses (`settingSchemas`). */
export function useSettingForm(key: SettingKey, initial: unknown) {
  const t = getAdminMessages().settingsPage;
  const save = useSaveSetting();
  const [message, setMessage] = React.useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const form = useForm<FieldValues>({
    resolver: zodResolver(settingSchemas[key] as never),
    defaultValues: (initial as FieldValues) ?? {},
  });
  const submit = form.handleSubmit(async (value) => {
    setMessage(null);
    try {
      await save.mutateAsync({ key, value });
      form.reset(value);
      setMessage({ ok: true, text: t.saved });
    } catch (error) {
      setMessage({ ok: false, text: errorText(error) });
    }
  });
  return { form, submit, saving: save.isPending, message };
}
