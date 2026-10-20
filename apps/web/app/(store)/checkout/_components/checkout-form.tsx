"use client";

import {
  BD_DISTRICTS,
  checkoutSchema,
  type WalletMethod,
} from "@aaarchive/shared/checkout";
import { deliveryChargeFor } from "@aaarchive/shared/delivery";
import { formatTaka } from "@aaarchive/shared/money";
import { normalizeBdPhone } from "@aaarchive/shared/phone";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { type FieldErrors, useForm } from "react-hook-form";
import type { z } from "zod";
import { useAccount } from "@/components/providers/account-provider";
import { CheckoutField, inputClass } from "@/components/store/store-field";
import {
  type TurnstileHandle,
  TurnstileWidget,
  turnstileSiteKey,
} from "@/components/turnstile-widget";
import { Button } from "@/components/ui/button";
import { useAddresses, useProfile } from "@/lib/account/use-account";
import { trackBeginCheckout, trackPurchase } from "@/lib/analytics/analytics";
import { ApiError } from "@/lib/api/api-error";
import { useCartHydrated, useCartStore } from "@/lib/cart/cart-store";
import { useCartValidation } from "@/lib/cart/use-cart-validation";
import { useCouponQuote } from "@/lib/cart/use-coupon-quote";
import { useStoreZones } from "@/lib/delivery-zone/use-store-zones";
import { format, getMessages } from "@/lib/i18n/i18n";
import { storeErrorText } from "@/lib/i18n/store-error-text";
import { saveLastOrder, savePendingPurchase } from "@/lib/order/last-order";
import { usePlaceOrder } from "@/lib/order/use-orders";
import { usePublicSettings } from "@/lib/settings/use-public-settings";
import { cn } from "@/lib/utils";
import { OrderSummary, type SummaryTotals } from "./order-summary";
import { RadioCard } from "./radio-card";
import { WalletPanel } from "./wallet-panel";

// Checkout (PRD §5.8, design §7.4). The form sends ids, quantities and the
// customer's details; the API prices the order (golden rule 2). Zod is used
// here and on /track-order only, never in shared storefront chunks
// (rules.md §4.2).

const formSchema = checkoutSchema.omit({
  items: true,
  couponCode: true,
  saveAddress: true,
  turnstileToken: true,
});
type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;
type Method = FormInput["payment"]["method"];

const DEFAULTS: FormInput = {
  name: "",
  phone: "",
  altPhone: "",
  email: "",
  zoneId: "",
  district: "" as FormInput["district"],
  area: "",
  address: "",
  note: "",
  payment: { method: "COD" },
};

/** Error code of a nested field, whatever payment shape is active. */
function paymentError(
  errors: FieldErrors<FormInput>,
  path: "senderNumber" | "trxId" | "advance.senderNumber" | "advance.trxId",
): string | undefined {
  const payment = errors.payment as
    | Record<
        string,
        { message?: string } & Record<string, { message?: string }>
      >
    | undefined;
  const [head, tail] = path.split(".") as [string, string | undefined];
  const node = payment?.[head];
  return (tail ? node?.[tail]?.message : node?.message) ?? undefined;
}

export function CheckoutForm() {
  const t = getMessages();
  const tc = t.checkout;
  const router = useRouter();
  const hydrated = useCartHydrated();
  const lines = useCartStore((s) => s.lines);
  const couponCode = useCartStore((s) => s.couponCode);
  const clearCart = useCartStore((s) => s.clear);
  const validation = useCartValidation();
  const zones = useStoreZones();
  const settings = usePublicSettings();
  const place = usePlaceOrder();
  const account = useAccount();
  const signedIn = account.status === "authenticated";
  const profile = useProfile();
  const addresses = useAddresses(signedIn);
  const turnstile = React.useRef<TurnstileHandle>(null);
  const [token, setToken] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [redirecting, setRedirecting] = React.useState(false);
  const [savedChoice, setSavedChoice] = React.useState<string>("new");
  const [saveAddress, setSaveAddress] = React.useState(true);
  const placed = React.useRef(false);

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: DEFAULTS,
    mode: "onTouched",
  });
  const { errors, isSubmitting } = form.formState;
  const method = form.watch("payment.method");
  const zoneId = form.watch("zoneId");
  const phone = normalizeBdPhone(form.watch("phone") ?? "");
  const quote = useCouponQuote(couponCode, validation.items, phone);

  // Money as shown; the API recomputes all of it when the order is placed.
  const cart = validation.data;
  const zone = zones.data?.find((z) => z.id === zoneId);
  const subtotal =
    cart?.subtotal ??
    lines.reduce((sum, l) => sum + l.snapshot.unitPrice * l.quantity, 0);
  const discount = quote.data?.discount ?? 0;
  const deliveryCharge = zone
    ? deliveryChargeFor(
        zone.charge,
        subtotal - discount,
        settings.data?.delivery.freeDeliveryThreshold ?? null,
      )
    : null;
  const totals: SummaryTotals = {
    subtotal,
    discount,
    couponCode: quote.data?.code ?? null,
    deliveryCharge,
    total: subtotal - discount + (deliveryCharge ?? 0),
  };

  const payments = settings.data?.payments;
  const wallets = (["BKASH", "NAGAD"] as const).filter((w) =>
    w === "BKASH" ? payments?.bkash.enabled : payments?.nagad.enabled,
  );
  const methods: Method[] = [
    ...(payments?.cod.enabled ? (["COD"] as const) : []),
    ...wallets,
    ...(payments?.sslcommerz.enabled ? (["SSLCOMMERZ"] as const) : []),
  ];
  const needAdvance =
    method === "COD" &&
    Boolean(payments?.codAdvanceDeliveryCharge) &&
    (deliveryCharge ?? 0) > 0 &&
    wallets.length > 0;

  const walletInfo = (w: WalletMethod) => ({
    label: w === "BKASH" ? tc.bkash : tc.nagad,
    number:
      (w === "BKASH" ? payments?.bkash.number : payments?.nagad.number) ?? "",
    instructions:
      (w === "BKASH"
        ? payments?.bkash.instructions
        : payments?.nagad.instructions) ?? "",
  });

  const chooseMethod = (next: Method) => {
    form.setValue(
      "payment",
      next === "COD" || next === "SSLCOMMERZ"
        ? { method: next }
        : { method: next, senderNumber: "", trxId: "" },
      { shouldDirty: true },
    );
  };

  // Back from SSLCommerz without paying: the order was cancelled, the cart kept.
  React.useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("payment");
    if (result === "failed") setFormError(tc.paymentFailed);
    if (result === "cancelled") setFormError(tc.paymentCancelled);
  }, [tc]);

  // Signed in: fill the form from the default address (else the profile),
  // once, without overwriting anything typed already.
  const applyAddress = React.useCallback(
    (a: NonNullable<typeof addresses.data>[number]) => {
      const opts = { shouldValidate: true, shouldDirty: true } as const;
      form.setValue("name", a.name, opts);
      form.setValue("phone", a.phone, opts);
      form.setValue("zoneId", a.zone.id, opts);
      form.setValue("district", a.district, opts);
      form.setValue("area", a.area, opts);
      form.setValue("address", a.address, opts);
    },
    [form],
  );
  const prefilled = React.useRef(false);
  React.useEffect(() => {
    if (prefilled.current || !profile.data || !addresses.data) return;
    prefilled.current = true;
    if (form.formState.isDirty) return;
    const fallback = form.getValues();
    form.reset({
      ...fallback,
      name: profile.data.name,
      phone: profile.data.phone ?? "",
      email: profile.data.email,
    });
    const preferred = addresses.data.find((a) => a.isDefault);
    if (preferred) {
      setSavedChoice(preferred.id);
      applyAddress(preferred);
    }
  }, [profile.data, addresses.data, form, applyAddress]);

  // The first available method is preselected once settings arrive.
  React.useEffect(() => {
    if (methods.length > 0 && !methods.includes(method))
      chooseMethod(methods[0]);
  });

  // COD with an advance: the advance fields appear and are required.
  const paymentValue = form.watch("payment");
  const advanceMethod =
    paymentValue.method === "COD" ? paymentValue.advance?.method : undefined;
  React.useEffect(() => {
    if (method !== "COD") return;
    const current = form.getValues("payment");
    const has = "advance" in current && current.advance;
    if (needAdvance && !has) {
      form.setValue("payment", {
        method: "COD",
        advance: { method: wallets[0], senderNumber: "", trxId: "" },
      });
    } else if (!needAdvance && has) {
      form.setValue("payment", { method: "COD" });
    }
  });

  // Lift the floating chat buttons above the sticky phone bar (as on the PDP).
  React.useEffect(() => {
    const root = document.documentElement;
    const phone = window.matchMedia("(max-width: 47.99rem)").matches;
    root.style.setProperty("--buy-bar-h", phone ? "4.75rem" : "0px");
    return () => {
      root.style.removeProperty("--buy-bar-h");
    };
  }, []);

  // begin_checkout once the cart is known (PRD §10).
  const began = React.useRef(false);
  React.useEffect(() => {
    if (began.current || !cart || cart.items.length === 0) return;
    began.current = true;
    trackBeginCheckout(
      cart.items.map((i) => ({
        id: i.variantId,
        name: i.product.name,
        price: i.unitPrice,
        quantity: i.quantity,
      })),
    );
  }, [cart]);

  const blocked = Boolean(
    cart?.notices.some(
      (n) => n.code === "OUT_OF_STOCK" || n.code === "NOT_ENOUGH_STOCK",
    ),
  );

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    if (blocked) {
      setFormError(t.cart.blocked);
      return;
    }
    if (turnstileSiteKey && !token) {
      setFormError(storeErrorText("TURNSTILE_FAILED"));
      return;
    }
    try {
      const order = await place.mutateAsync({
        ...values,
        items: validation.items,
        // Only a coupon the API accepted; a bad code never blocks the order.
        couponCode: quote.data ? quote.data.code : undefined,
        saveAddress: signedIn && savedChoice === "new" && saveAddress,
        turnstileToken: token ?? undefined,
      });
      const purchaseItems = (cart?.items ?? []).map((i) => ({
        id: i.variantId,
        name: i.product.name,
        price: i.unitPrice,
        quantity: i.quantity,
      }));
      saveLastOrder(order);
      if (order.paymentUrl) {
        // Pay on SSLCommerz's page. The cart stays until the payment is
        // confirmed (the success page empties it and counts the purchase).
        savePendingPurchase({
          orderNumber: order.orderNumber,
          total: order.total,
          items: purchaseItems,
        });
        setRedirecting(true);
        window.location.assign(order.paymentUrl);
        return;
      }
      placed.current = true;
      trackPurchase(order.orderNumber, order.total, purchaseItems);
      router.replace(`/order/success/${order.orderNumber}`);
      clearCart();
    } catch (error) {
      // Turnstile tokens work once.
      turnstile.current?.reset();
      if (ApiError.isApiError(error) && error.code === "TRXID_ALREADY_USED") {
        const path =
          values.payment.method === "COD"
            ? "payment.advance.trxId"
            : "payment.trxId";
        form.setError(path as never, { message: "TRXID_ALREADY_USED" });
      }
      if (
        ApiError.isApiError(error) &&
        ["OUT_OF_STOCK", "ITEM_UNAVAILABLE", "QTY_LIMIT"].includes(error.code)
      ) {
        void validation.refetch();
      }
      setFormError(storeErrorText(error));
    }
  });

  if (!hydrated) {
    return (
      <div aria-busy="true" className="site-container min-h-[60dvh] py-12" />
    );
  }

  if (lines.length === 0 && !placed.current) {
    return (
      <div className="site-container flex min-h-[50dvh] flex-col items-center justify-center gap-6 py-16 text-center">
        <p className="text-muted-foreground type-mono-label">
          {t.cart.emptyText}
        </p>
        <Button
          asChild
          className="h-11 min-w-48 justify-between rounded-none px-3 type-mono-label uppercase"
        >
          <Link href="/shop">
            {t.cart.startShopping}
            <ArrowUpRight aria-hidden strokeWidth={1.5} />
          </Link>
        </Button>
      </div>
    );
  }

  if (settings.isError || zones.isError) {
    return (
      <div className="site-container py-16">
        <div
          role="alert"
          className="flex flex-col items-start gap-4 border border-destructive p-4"
        >
          <p className="type-mono-label">{tc.loadFailed}</p>
          <Button
            variant="outline"
            className="rounded-none"
            onClick={() => {
              void settings.refetch();
              void zones.refetch();
            }}
          >
            {t.actions.retry}
          </Button>
        </div>
      </div>
    );
  }

  const sectionTitle = (index: number, label: string) => (
    <h2 className="mb-5 flex items-baseline gap-3 type-display-sm">
      <span aria-hidden className="text-muted-foreground type-mono-micro">
        {`// 0${index}`}
      </span>
      {label}
    </h2>
  );

  return (
    <div className="site-container pt-6 pb-28 md:py-12">
      <h1 className="mb-6 type-display-lg">{tc.title}</h1>

      {/* Phones: collapsible summary above the form (design §7.4). */}
      <details className="group mb-8 border bg-card md:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 type-mono-label">
          {format(tc.showSummary, { total: formatTaka(totals.total) })}
          <ChevronDown
            aria-hidden
            strokeWidth={1.5}
            className="size-4 transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="border-t p-4">
          <OrderSummary lines={lines} cart={cart} totals={totals} />
        </div>
      </details>

      <div className="grid gap-10 md:grid-cols-12">
        <form
          id="checkout-form"
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-10 md:col-span-7"
        >
          {account.status === "guest" && (
            <p className="-mb-4 text-muted-foreground type-mono-label">
              {tc.signInPrompt}{" "}
              <Link
                href="/account/login?next=/checkout"
                className="text-foreground underline underline-offset-4 hover:text-primary"
              >
                {tc.signInLink}
              </Link>
            </p>
          )}
          <section aria-labelledby="sec-contact">
            <div id="sec-contact">{sectionTitle(1, tc.contact)}</div>
            <div className="grid gap-5 sm:grid-cols-2">
              <CheckoutField
                id="co-name"
                label={tc.name}
                error={errors.name?.message}
                className="sm:col-span-2"
              >
                <input
                  id="co-name"
                  autoComplete="name"
                  maxLength={60}
                  aria-invalid={Boolean(errors.name)}
                  className={inputClass}
                  {...form.register("name")}
                />
              </CheckoutField>
              <CheckoutField
                id="co-phone"
                label={tc.phone}
                hint={tc.phoneHint}
                error={errors.phone?.message}
              >
                <input
                  id="co-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="01XXXXXXXXX"
                  aria-invalid={Boolean(errors.phone)}
                  className={inputClass}
                  {...form.register("phone")}
                />
              </CheckoutField>
              <CheckoutField
                id="co-alt"
                label={tc.altPhone}
                optional={tc.optional}
                error={errors.altPhone?.message}
              >
                <input
                  id="co-alt"
                  type="tel"
                  inputMode="tel"
                  placeholder="01XXXXXXXXX"
                  aria-invalid={Boolean(errors.altPhone)}
                  className={inputClass}
                  {...form.register("altPhone")}
                />
              </CheckoutField>
              <CheckoutField
                id="co-email"
                label={tc.email}
                optional={tc.optional}
                hint={tc.emailHint}
                error={errors.email?.message}
                className="sm:col-span-2"
              >
                <input
                  id="co-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  aria-invalid={Boolean(errors.email)}
                  className={inputClass}
                  {...form.register("email")}
                />
              </CheckoutField>
            </div>
          </section>

          <section aria-labelledby="sec-delivery" className="border-t pt-8">
            <div id="sec-delivery">{sectionTitle(2, tc.delivery)}</div>
            {signedIn && (addresses.data?.length ?? 0) > 0 && (
              <CheckoutField id="co-saved" label={tc.useSaved} className="mb-5">
                <div className="relative">
                  <select
                    id="co-saved"
                    value={savedChoice}
                    onChange={(e) => {
                      setSavedChoice(e.target.value);
                      const chosen = addresses.data?.find(
                        (a) => a.id === e.target.value,
                      );
                      if (chosen) applyAddress(chosen);
                    }}
                    className={cn(inputClass, "appearance-none pr-9")}
                  >
                    {addresses.data?.map((a) => (
                      <option key={a.id} value={a.id}>
                        {`${a.name} · ${a.area}, ${a.district}`}
                      </option>
                    ))}
                    <option value="new">{tc.newAddress}</option>
                  </select>
                  <ChevronDown
                    aria-hidden
                    strokeWidth={1.5}
                    className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                </div>
              </CheckoutField>
            )}
            <fieldset className="mb-5 flex flex-col gap-2">
              <legend className="mb-2 text-muted-foreground uppercase type-mono-label">
                {tc.zone}
              </legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {zones.isPending
                  ? [0, 1, 2].map((i) => (
                      <div key={i} className="skeleton h-14" />
                    ))
                  : zones.data?.map((z) => (
                      <RadioCard
                        key={z.id}
                        name="zone"
                        value={z.id}
                        checked={zoneId === z.id}
                        onChange={(v) =>
                          form.setValue("zoneId", v, {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                      >
                        <span className="uppercase type-mono-label">
                          {z.name}
                        </span>
                        <span className="text-muted-foreground type-mono-micro">
                          {format(tc.zoneCharge, {
                            charge:
                              z.charge === 0 ? tc.free : formatTaka(z.charge),
                            days: z.estimatedDays,
                          })}
                        </span>
                      </RadioCard>
                    ))}
              </div>
              {errors.zoneId && (
                <p className="text-destructive type-mono-micro">
                  {storeErrorText("ZONE_UNAVAILABLE")}
                </p>
              )}
            </fieldset>
            <div className="grid gap-5 sm:grid-cols-2">
              <CheckoutField
                id="co-district"
                label={tc.district}
                error={errors.district?.message}
              >
                <div className="relative">
                  <select
                    id="co-district"
                    autoComplete="address-level2"
                    aria-invalid={Boolean(errors.district)}
                    className={cn(inputClass, "appearance-none pr-9")}
                    {...form.register("district")}
                  >
                    <option value="">{tc.chooseDistrict}</option>
                    {BD_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden
                    strokeWidth={1.5}
                    className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
                  />
                </div>
              </CheckoutField>
              <CheckoutField
                id="co-area"
                label={tc.area}
                error={errors.area?.message}
              >
                <input
                  id="co-area"
                  autoComplete="address-level3"
                  maxLength={80}
                  aria-invalid={Boolean(errors.area)}
                  className={inputClass}
                  {...form.register("area")}
                />
              </CheckoutField>
              <CheckoutField
                id="co-address"
                label={tc.address}
                hint={tc.addressHint}
                error={errors.address?.message}
                className="sm:col-span-2"
              >
                <input
                  id="co-address"
                  autoComplete="street-address"
                  maxLength={200}
                  aria-invalid={Boolean(errors.address)}
                  className={inputClass}
                  {...form.register("address")}
                />
              </CheckoutField>
              <CheckoutField
                id="co-note"
                label={tc.note}
                optional={tc.optional}
                error={errors.note?.message}
                className="sm:col-span-2"
              >
                <textarea
                  id="co-note"
                  rows={2}
                  maxLength={300}
                  aria-invalid={Boolean(errors.note)}
                  className={cn(inputClass, "h-auto py-3")}
                  {...form.register("note")}
                />
              </CheckoutField>
              {signedIn && savedChoice === "new" && (
                <label className="flex min-h-11 items-center gap-3 type-mono-label sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={saveAddress}
                    onChange={(e) => setSaveAddress(e.target.checked)}
                    className="size-5 accent-primary"
                  />
                  {tc.saveAddress}
                </label>
              )}
            </div>
          </section>

          <section aria-labelledby="sec-payment" className="border-t pt-8">
            <div id="sec-payment">{sectionTitle(3, tc.payment)}</div>
            {settings.isPending ? (
              <div className="skeleton h-14" />
            ) : methods.length === 0 ? (
              <p
                role="alert"
                className="border border-destructive p-3 type-mono-label"
              >
                {tc.noMethods}
              </p>
            ) : (
              <fieldset className="flex flex-col gap-3">
                <legend className="sr-only">{tc.payment}</legend>
                {methods.map((m) => (
                  <div key={m} className="flex flex-col gap-3">
                    <RadioCard
                      name="payment"
                      value={m}
                      checked={method === m}
                      onChange={(v) => chooseMethod(v as Method)}
                    >
                      <span className="uppercase type-mono-label">
                        {m === "COD"
                          ? tc.cod
                          : m === "SSLCOMMERZ"
                            ? tc.online
                            : walletInfo(m).label}
                      </span>
                      <span className="text-muted-foreground type-mono-micro">
                        {m === "COD"
                          ? tc.codNote
                          : m === "SSLCOMMERZ"
                            ? tc.onlineNote
                            : tc.walletNote}
                      </span>
                    </RadioCard>
                    {method === m && m === "SSLCOMMERZ" && (
                      <p className="border border-border bg-sunken p-3 type-mono-micro">
                        {format(tc.onlineRedirect, {
                          amount: formatTaka(totals.total),
                        })}
                      </p>
                    )}
                    {method === m && m !== "COD" && m !== "SSLCOMMERZ" && (
                      <WalletPanel
                        idPrefix={`co-${m.toLowerCase()}`}
                        wallet={walletInfo(m).label}
                        number={walletInfo(m).number}
                        instructions={walletInfo(m).instructions}
                        amount={totals.total}
                        sender={form.register("payment.senderNumber" as never)}
                        trxId={form.register("payment.trxId" as never)}
                        errors={{
                          senderNumber: paymentError(errors, "senderNumber"),
                          trxId: paymentError(errors, "trxId"),
                        }}
                      />
                    )}
                    {method === m && m === "COD" && needAdvance && (
                      <div className="flex flex-col gap-3">
                        <p className="type-mono-micro">
                          {format(tc.codAdvance, {
                            amount: formatTaka(deliveryCharge ?? 0),
                          })}
                        </p>
                        {wallets.length > 1 && (
                          <div className="flex flex-col gap-2">
                            <span className="text-muted-foreground uppercase type-mono-label">
                              {tc.advanceWallet}
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              {wallets.map((w) => (
                                <RadioCard
                                  key={w}
                                  name="advance"
                                  value={w}
                                  checked={advanceMethod === w}
                                  onChange={(v) =>
                                    form.setValue(
                                      "payment.advance.method" as never,
                                      v as never,
                                    )
                                  }
                                >
                                  <span className="uppercase type-mono-label">
                                    {walletInfo(w).label}
                                  </span>
                                </RadioCard>
                              ))}
                            </div>
                          </div>
                        )}
                        {advanceMethod && (
                          <WalletPanel
                            idPrefix="co-advance"
                            wallet={walletInfo(advanceMethod).label}
                            number={walletInfo(advanceMethod).number}
                            instructions={
                              walletInfo(advanceMethod).instructions
                            }
                            amount={deliveryCharge ?? 0}
                            sender={form.register(
                              "payment.advance.senderNumber" as never,
                            )}
                            trxId={form.register(
                              "payment.advance.trxId" as never,
                            )}
                            errors={{
                              senderNumber: paymentError(
                                errors,
                                "advance.senderNumber",
                              ),
                              trxId: paymentError(errors, "advance.trxId"),
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </fieldset>
            )}
          </section>

          {turnstileSiteKey && (
            <fieldset>
              <legend className="sr-only">{tc.securityCheck}</legend>
              <TurnstileWidget ref={turnstile} onToken={setToken} />
            </fieldset>
          )}

          {formError && (
            <p
              role="alert"
              className="border border-destructive p-3 type-mono-label"
            >
              {formError}
            </p>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || redirecting || methods.length === 0}
            className="hidden h-12 w-full justify-between rounded-none px-4 type-mono-label uppercase md:flex"
          >
            {redirecting
              ? tc.redirecting
              : isSubmitting
                ? tc.placing
                : tc.placeOrder}
            <span>{formatTaka(totals.total)}</span>
          </Button>
        </form>

        <aside className="hidden md:col-span-5 md:block">
          <div className="sticky top-[calc(var(--header-h)+1.5rem)] border bg-card p-5">
            <h2 className="mb-4 type-display-sm">{tc.summary}</h2>
            <OrderSummary lines={lines} cart={cart} totals={totals} />
          </div>
        </aside>
      </div>

      {/* Phones: sticky Place Order (design §7.4). */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 backdrop-blur-sm md:hidden">
        <Button
          type="submit"
          form="checkout-form"
          disabled={isSubmitting || redirecting || methods.length === 0}
          className="h-12 w-full justify-between rounded-none px-4 type-mono-label uppercase"
        >
          {redirecting
            ? tc.redirecting
            : isSubmitting
              ? tc.placing
              : tc.placeOrder}
          <span>{formatTaka(totals.total)}</span>
        </Button>
      </div>
    </div>
  );
}
