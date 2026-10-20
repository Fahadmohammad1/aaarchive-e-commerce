"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import * as React from "react";
import { CheckoutField, inputClass } from "@/components/store/store-field";
import {
  type TurnstileHandle,
  TurnstileWidget,
  turnstileSiteKey,
} from "@/components/turnstile-widget";
import { Button } from "@/components/ui/button";
import { sendContactMessage } from "@/lib/content/content-client-api";
import { getMessages } from "@/lib/i18n/i18n";
import { storeErrorText } from "@/lib/i18n/store-error-text";

type Field = "name" | "contact" | "message";

/** Length rules of contactMessageSchema, checked here without Zod (rules.md §4.2). */
const RULES: Record<Field, { min: number; max: number }> = {
  name: { min: 2, max: 60 },
  contact: { min: 5, max: 100 },
  message: { min: 10, max: 2000 },
};

export function ContactForm() {
  const t = getMessages().contact;
  const [values, setValues] = React.useState<Record<Field, string>>({
    name: "",
    contact: "",
    message: "",
  });
  const [errors, setErrors] = React.useState<Partial<Record<Field, string>>>(
    {},
  );
  const [token, setToken] = React.useState<string | null>(null);
  const turnstile = React.useRef<TurnstileHandle>(null);
  const send = useMutation({ mutationFn: sendContactMessage });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next: Partial<Record<Field, string>> = {};
    for (const key of Object.keys(RULES) as Field[]) {
      const v = values[key].trim();
      if (!v) next[key] = "REQUIRED";
      else if (v.length < RULES[key].min) next[key] = "TOO_SHORT";
      else if (v.length > RULES[key].max) next[key] = "TOO_LONG";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    send.mutate(
      {
        name: values.name.trim(),
        contact: values.contact.trim(),
        message: values.message.trim(),
        turnstileToken: token ?? undefined,
      },
      {
        onSuccess: () => setValues({ name: "", contact: "", message: "" }),
        onSettled: () => turnstile.current?.reset(),
      },
    );
  };

  if (send.isSuccess) {
    return (
      <p role="status" className="border border-primary p-4 type-mono-label">
        {t.sent}
      </p>
    );
  }

  const set =
    (key: Field) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));

  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex flex-col gap-5 border bg-card p-5 md:p-8"
    >
      <h2 className="type-display-sm">{t.formTitle}</h2>
      <CheckoutField id="ct-name" label={t.name} error={errors.name}>
        <input
          id="ct-name"
          autoComplete="name"
          maxLength={60}
          value={values.name}
          onChange={set("name")}
          aria-invalid={Boolean(errors.name)}
          className={inputClass}
        />
      </CheckoutField>
      <CheckoutField
        id="ct-contact"
        label={t.contact}
        hint={t.contactHint}
        error={errors.contact}
      >
        <input
          id="ct-contact"
          autoComplete="tel"
          maxLength={100}
          value={values.contact}
          onChange={set("contact")}
          aria-invalid={Boolean(errors.contact)}
          className={inputClass}
        />
      </CheckoutField>
      <CheckoutField id="ct-message" label={t.message} error={errors.message}>
        <textarea
          id="ct-message"
          rows={5}
          maxLength={2000}
          value={values.message}
          onChange={set("message")}
          aria-invalid={Boolean(errors.message)}
          className={`${inputClass} h-auto py-3`}
        />
      </CheckoutField>
      {turnstileSiteKey && (
        <TurnstileWidget ref={turnstile} onToken={setToken} />
      )}
      {send.isError && (
        <p
          role="alert"
          className="border border-destructive p-3 type-mono-label"
        >
          {storeErrorText(send.error)}
        </p>
      )}
      <Button
        type="submit"
        disabled={send.isPending}
        className="h-12 justify-between rounded-none px-4 type-mono-label uppercase"
      >
        {send.isPending ? t.sending : t.send}
        <ArrowUpRight aria-hidden strokeWidth={1.5} />
      </Button>
    </form>
  );
}
