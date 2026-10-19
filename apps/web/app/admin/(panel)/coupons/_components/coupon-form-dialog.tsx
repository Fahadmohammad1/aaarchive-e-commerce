"use client";

import { type CouponInput, couponInputSchema } from "@aaarchive/shared/coupon";
import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import type { z } from "zod";
import { FormField } from "@/components/admin/form-field";
import { NativeSelect } from "@/components/admin/native-select";
import { SwitchField } from "@/components/admin/switch-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/api-error";
import type { AdminCoupon } from "@/lib/coupon/coupon-schemas";
import { useSaveCoupon } from "@/lib/coupon/use-coupons";
import { fromLocalInput, toLocalInput } from "@/lib/datetime-local";
import { errorText } from "@/lib/i18n/error-text";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import { ScopePicker } from "./scope-picker";

type Values = z.output<typeof couponInputSchema>;

const EMPTY: CouponInput = {
  code: "",
  type: "PERCENT",
  value: 10,
  minOrder: 0,
  maxDiscount: null,
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  perPhoneLimit: null,
  scope: "ALL",
  scopeIds: [],
  isActive: true,
};

/** "" → null, otherwise a number (NaN stays NaN so Zod reports it). */
const numberOrNull = (value: unknown) =>
  value === "" || value == null ? null : Number(value);

function toValues(c: AdminCoupon): CouponInput {
  return {
    code: c.code,
    type: c.type,
    value: c.value,
    minOrder: c.minOrder,
    maxDiscount: c.maxDiscount,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    usageLimit: c.usageLimit,
    perPhoneLimit: c.perPhoneLimit,
    scope: c.scope,
    scopeIds: c.scopeIds,
    isActive: c.isActive,
  };
}

export function CouponFormDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AdminCoupon | null;
}) {
  const t = getAdminMessages();
  const tc = t.coupons;
  const save = useSaveCoupon();
  const [formError, setFormError] = React.useState<string | null>(null);
  const form = useForm<CouponInput, unknown, Values>({
    resolver: zodResolver(couponInputSchema),
    defaultValues: EMPTY,
  });
  const { errors, isSubmitting } = form.formState;
  const type = form.watch("type");
  const scope = form.watch("scope");

  React.useEffect(() => {
    if (!open) return;
    setFormError(null);
    form.reset(item ? toValues(item) : EMPTY);
  }, [open, item, form]);

  const onSubmit = form.handleSubmit(async (body) => {
    setFormError(null);
    try {
      // Coupons for all products carry no ids.
      const clean = body.scope === "ALL" ? { ...body, scopeIds: [] } : body;
      await save.mutateAsync({ id: item?.id, body: clean });
      onOpenChange(false);
    } catch (error) {
      if (ApiError.isApiError(error) && error.code === "CODE_TAKEN") {
        form.setError("code", { message: "CODE_TAKEN" });
      } else {
        setFormError(errorText(error));
      }
    }
  });

  const nullableNumber = (
    name: "maxDiscount" | "usageLimit" | "perPhoneLimit",
    id: string,
    label: string,
    hint: string,
  ) => (
    <FormField id={id} label={label} hint={hint} error={errors[name]?.message}>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        className="font-mono"
        aria-invalid={Boolean(errors[name])}
        {...form.register(name, { setValueAs: numberOrNull })}
      />
    </FormField>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{item ? tc.editCoupon : tc.newCoupon}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
          <FormField
            id="coupon-code"
            label={tc.code}
            hint={tc.codeHint}
            error={errors.code?.message}
          >
            <Input
              id="coupon-code"
              autoComplete="off"
              maxLength={30}
              className="font-mono uppercase"
              aria-invalid={Boolean(errors.code)}
              {...form.register("code")}
            />
          </FormField>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField id="coupon-type" label={tc.type}>
              <NativeSelect id="coupon-type" {...form.register("type")}>
                <option value="PERCENT">{tc.percent}</option>
                <option value="FIXED">{tc.fixed}</option>
              </NativeSelect>
            </FormField>
            <FormField
              id="coupon-value"
              label={tc.value}
              hint={
                type === "PERCENT" ? tc.valuePercentHint : tc.valueFixedHint
              }
              error={errors.value?.message}
            >
              <Input
                id="coupon-value"
                type="number"
                inputMode="numeric"
                min={1}
                max={type === "PERCENT" ? 100 : undefined}
                className="font-mono"
                aria-invalid={Boolean(errors.value)}
                {...form.register("value", { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id="coupon-min"
              label={tc.minOrder}
              hint={tc.minOrderHint}
              error={errors.minOrder?.message}
            >
              <Input
                id="coupon-min"
                type="number"
                inputMode="numeric"
                min={0}
                className="font-mono"
                aria-invalid={Boolean(errors.minOrder)}
                {...form.register("minOrder", { valueAsNumber: true })}
              />
            </FormField>
            {type === "PERCENT" &&
              nullableNumber(
                "maxDiscount",
                "coupon-max",
                tc.maxDiscount,
                tc.maxDiscountHint,
              )}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {(["startsAt", "endsAt"] as const).map((name) => (
              <Controller
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormField
                    id={`coupon-${name}`}
                    label={name === "startsAt" ? tc.startsAt : tc.endsAt}
                    error={errors[name]?.message}
                  >
                    <Input
                      id={`coupon-${name}`}
                      type="datetime-local"
                      className="font-mono"
                      value={toLocalInput(field.value)}
                      onChange={(e) =>
                        field.onChange(fromLocalInput(e.target.value))
                      }
                      onBlur={field.onBlur}
                      aria-invalid={Boolean(errors[name])}
                    />
                  </FormField>
                )}
              />
            ))}
          </div>
          <p className="-mt-3 text-muted-foreground text-xs">{tc.datesHint}</p>

          <div className="grid gap-5 sm:grid-cols-2">
            {nullableNumber(
              "usageLimit",
              "coupon-usage",
              tc.usageLimit,
              tc.usageLimitHint,
            )}
            {nullableNumber(
              "perPhoneLimit",
              "coupon-per-phone",
              tc.perPhoneLimit,
              tc.perPhoneLimitHint,
            )}
          </div>

          <FormField id="coupon-scope" label={tc.scope}>
            <NativeSelect id="coupon-scope" {...form.register("scope")}>
              <option value="ALL">{tc.scopeAll}</option>
              <option value="CATEGORY">{tc.scopeCategory}</option>
              <option value="PRODUCT">{tc.scopeProduct}</option>
            </NativeSelect>
          </FormField>
          {scope !== "ALL" && (
            <Controller
              control={form.control}
              name="scopeIds"
              render={({ field }) => (
                <ScopePicker
                  kind={scope === "CATEGORY" ? "category" : "product"}
                  value={field.value ?? []}
                  onChange={field.onChange}
                  error={errors.scopeIds?.message}
                />
              )}
            />
          )}

          <Controller
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <SwitchField
                id="coupon-active"
                label={tc.active}
                checked={field.value ?? true}
                onCheckedChange={field.onChange}
              />
            )}
          />
          {formError && (
            <p role="alert" className="text-destructive text-sm">
              {formError}
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
