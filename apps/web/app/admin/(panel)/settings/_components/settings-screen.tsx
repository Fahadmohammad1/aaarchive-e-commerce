"use client";

import type { MediaAsset } from "@aaarchive/shared/media";
import {
  Controller,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
import { ListError, ListSkeleton } from "@/components/admin/list-state";
import { PageHeader } from "@/components/admin/page-header";
import { SwitchField } from "@/components/admin/switch-field";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { useAdminSettings } from "@/lib/settings/use-admin-settings";
import {
  errorAt,
  ImageField,
  TextField,
} from "../../content/_components/fields";
import { useSettingForm } from "./use-setting-form";

type F = UseFormReturn<FieldValues>;
type Media = Record<string, MediaAsset>;

function SaveRow({
  saving,
  message,
}: {
  saving: boolean;
  message: { ok: boolean; text: string } | null;
}) {
  const t = getAdminMessages().settingsPage;
  return (
    <div className="flex flex-wrap items-center gap-3 border-t pt-4">
      <Button type="submit" size="lg" disabled={saving}>
        {saving ? getAdminMessages().saving : t.save}
      </Button>
      {message && (
        <span
          role={message.ok ? "status" : "alert"}
          className={
            message.ok ? "text-sm text-success" : "text-destructive text-sm"
          }
        >
          {message.text}
        </span>
      )}
    </div>
  );
}

function StoreTab({ initial, media }: { initial: unknown; media: Media }) {
  const t = getAdminMessages().settingsPage;
  const { form, submit, saving, message } = useSettingForm("store", initial);
  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex max-w-2xl flex-col gap-5"
    >
      <TextField
        form={form as F}
        name="name"
        id="st-name"
        label={t.storeName}
        maxLength={60}
      />
      <ImageField
        control={form.control}
        name="logo"
        id="st-logo"
        label={t.logo}
        media={media}
        error={errorAt(form as F, "logo.alt")}
      />
      <p className="-mt-3 text-muted-foreground text-xs">{t.logoHint}</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          form={form as F}
          name="phone"
          id="st-phone"
          label={t.phone}
          maxLength={20}
          mono
        />
        <TextField
          form={form as F}
          name="whatsapp"
          id="st-wa"
          label={t.whatsapp}
          hint={t.whatsappHint}
          maxLength={20}
          mono
        />
      </div>
      <TextField
        form={form as F}
        name="messenger"
        id="st-ms"
        label={t.messenger}
        maxLength={300}
        mono
      />
      <TextField
        form={form as F}
        name="email"
        id="st-email"
        label={t.email}
        hint={t.emailHint}
        maxLength={120}
      />
      <TextField
        form={form as F}
        name="address"
        id="st-address"
        label={t.address}
        maxLength={300}
        textarea
      />
      <SaveRow saving={saving} message={message} />
    </form>
  );
}

function PaymentsTab({ initial }: { initial: unknown }) {
  const t = getAdminMessages().settingsPage;
  const { form, submit, saving, message } = useSettingForm("payments", initial);
  const toggle = (name: string, id: string, label: string) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <SwitchField
          id={id}
          label={label}
          checked={Boolean(field.value)}
          onCheckedChange={field.onChange}
        />
      )}
    />
  );
  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex max-w-2xl flex-col gap-6"
    >
      <fieldset className="flex flex-col gap-3 rounded-md border p-4">
        <legend className="px-1 font-medium">{t.cod}</legend>
        {toggle("cod.enabled", "pay-cod", t.enabled)}
        {toggle("codAdvanceDeliveryCharge", "pay-adv", t.codAdvance)}
        <p className="text-muted-foreground text-xs">{t.codAdvanceHint}</p>
      </fieldset>
      {(["bkash", "nagad"] as const).map((w) => (
        <fieldset key={w} className="flex flex-col gap-3 rounded-md border p-4">
          <legend className="px-1 font-medium">{t[w]}</legend>
          {toggle(`${w}.enabled`, `pay-${w}`, t.enabled)}
          <TextField
            form={form as F}
            name={`${w}.number`}
            id={`pay-${w}-n`}
            label={t.walletNumber}
            maxLength={20}
            mono
          />
          <TextField
            form={form as F}
            name={`${w}.instructions`}
            id={`pay-${w}-i`}
            label={t.walletInstructions}
            maxLength={500}
            textarea
          />
          <p className="text-muted-foreground text-xs">{t.walletOffHint}</p>
        </fieldset>
      ))}
      <SaveRow saving={saving} message={message} />
    </form>
  );
}

function StockTab({ stock, delivery }: { stock: unknown; delivery: unknown }) {
  const t = getAdminMessages().settingsPage;
  const stockForm = useSettingForm("stock", stock);
  const deliveryForm = useSettingForm("delivery", delivery);
  const number = (
    form: F,
    name: string,
    id: string,
    label: string,
    hint: string,
    nullable = false,
  ) => (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-medium text-sm">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        className="h-11 w-36 rounded-lg border border-input bg-transparent px-2.5 font-mono outline-none focus-visible:border-ring dark:bg-input/30"
        aria-invalid={Boolean(errorAt(form, name))}
        {...form.register(name, {
          setValueAs: (v: string) =>
            v === "" ? (nullable ? null : Number.NaN) : Number(v),
        })}
      />
      <p className="text-muted-foreground text-xs">{hint}</p>
    </div>
  );
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <form
        onSubmit={stockForm.submit}
        noValidate
        className="flex flex-col gap-5"
      >
        {number(
          stockForm.form as F,
          "lowStockThreshold",
          "set-low",
          t.lowStock,
          t.lowStockHint,
        )}
        {number(
          stockForm.form as F,
          "maxQtyPerVariant",
          "set-max",
          t.maxQty,
          "1–99",
        )}
        <SaveRow saving={stockForm.saving} message={stockForm.message} />
      </form>
      <form
        onSubmit={deliveryForm.submit}
        noValidate
        className="flex flex-col gap-5"
      >
        {number(
          deliveryForm.form as F,
          "freeDeliveryThreshold",
          "set-free",
          t.freeDelivery,
          t.freeDeliveryHint,
          true,
        )}
        <SaveRow saving={deliveryForm.saving} message={deliveryForm.message} />
      </form>
    </div>
  );
}

function SeoTab({ initial, media }: { initial: unknown; media: Media }) {
  const t = getAdminMessages().settingsPage;
  const { form, submit, saving, message } = useSettingForm("seo", initial);
  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex max-w-2xl flex-col gap-5"
    >
      <TextField
        form={form as F}
        name="title"
        id="seo-title"
        label={t.seoTitle}
        maxLength={70}
      />
      <TextField
        form={form as F}
        name="description"
        id="seo-desc"
        label={t.seoDescription}
        maxLength={160}
        textarea
      />
      <ImageField
        control={form.control}
        name="ogImage"
        id="seo-og"
        label={t.ogImage}
        media={media}
        error={errorAt(form as F, "ogImage.alt")}
      />
      <p className="-mt-3 text-muted-foreground text-xs">{t.ogImageHint}</p>
      <SaveRow saving={saving} message={message} />
    </form>
  );
}

function TrackingTab({ initial }: { initial: unknown }) {
  const t = getAdminMessages().settingsPage;
  const { form, submit, saving, message } = useSettingForm("tracking", initial);
  return (
    <form
      onSubmit={submit}
      noValidate
      className="flex max-w-2xl flex-col gap-5"
    >
      <p className="text-muted-foreground text-sm">{t.trackingHint}</p>
      <TextField
        form={form as F}
        name="ga4Id"
        id="tr-ga4"
        label={t.ga4}
        maxLength={30}
        mono
      />
      <TextField
        form={form as F}
        name="metaPixelId"
        id="tr-pixel"
        label={t.pixel}
        maxLength={30}
        mono
      />
      <TextField
        form={form as F}
        name="clarityId"
        id="tr-clarity"
        label={t.clarity}
        maxLength={30}
        mono
      />
      <SaveRow saving={saving} message={message} />
    </form>
  );
}

/** Settings (PRD §6.8). Owner only; the API refuses everyone else. */
export function SettingsScreen() {
  const t = getAdminMessages();
  const ts = t.settingsPage;
  const { user } = useAuth();
  const settings = useAdminSettings();
  if (user?.role !== "OWNER") {
    return <p className="text-muted-foreground">{t.errors.FORBIDDEN}</p>;
  }
  const data = settings.data;
  return (
    <>
      <PageHeader title={t.nav.settings} description={ts.intro} />
      {settings.isPending ? (
        <ListSkeleton rows={6} />
      ) : settings.isError || !data ? (
        <ListError error={settings.error} onRetry={() => settings.refetch()} />
      ) : (
        <Tabs defaultValue="store" className="gap-6">
          <TabsList className="h-auto w-full flex-wrap justify-start">
            {(Object.keys(ts.tabs) as Array<keyof typeof ts.tabs>).map(
              (tab) => (
                <TabsTrigger key={tab} value={tab} className="min-h-10">
                  {ts.tabs[tab]}
                </TabsTrigger>
              ),
            )}
          </TabsList>
          <TabsContent value="store">
            <StoreTab initial={data.settings.store} media={data.media} />
          </TabsContent>
          <TabsContent value="payments">
            <PaymentsTab initial={data.settings.payments} />
          </TabsContent>
          <TabsContent value="stock">
            <StockTab
              stock={data.settings.stock}
              delivery={data.settings.delivery}
            />
          </TabsContent>
          <TabsContent value="seo">
            <SeoTab initial={data.settings.seo} media={data.media} />
          </TabsContent>
          <TabsContent value="tracking">
            <TrackingTab initial={data.settings.tracking} />
          </TabsContent>
        </Tabs>
      )}
    </>
  );
}
