"use client";

import {
  type AddressInput,
  addressInputSchema,
  type SavedAddress,
} from "@aaarchive/shared/account";
import { BD_DISTRICTS } from "@aaarchive/shared/checkout";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { CheckoutField, inputClass } from "@/components/store/store-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useReturnFocus } from "@/lib/a11y/use-return-focus";
import { applyFieldErrors } from "@/lib/account/account-form-errors";
import { useSaveAddress } from "@/lib/account/use-account";
import { useStoreZones } from "@/lib/delivery-zone/use-store-zones";
import { getMessages } from "@/lib/i18n/i18n";
import { storeErrorText } from "@/lib/i18n/store-error-text";
import { cn } from "@/lib/utils";
import { Notice } from "../../_components/auth-card";

type FormInput = z.input<typeof addressInputSchema>;
type FormValues = z.output<typeof addressInputSchema>;

/** Add or edit one saved address (same rules as checkout). */
export function AddressDialog({
  address,
  onClose,
}: {
  address: SavedAddress | null;
  onClose: () => void;
}) {
  const ta = getMessages().account;
  const returnFocus = useReturnFocus();
  const zones = useStoreZones();
  const save = useSaveAddress();
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(addressInputSchema),
    defaultValues: address
      ? {
          name: address.name,
          phone: address.phone,
          zoneId: address.zone.id,
          district: address.district,
          area: address.area,
          address: address.address,
          isDefault: address.isDefault,
        }
      : {
          name: "",
          phone: "",
          zoneId: "",
          district: "" as FormInput["district"],
          area: "",
          address: "",
          isDefault: false,
        },
    mode: "onTouched",
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({
        id: address?.id,
        input: values as AddressInput,
      });
      onClose();
    } catch (err) {
      if (
        !applyFieldErrors(err, form.setError, [
          "name",
          "phone",
          "zoneId",
          "district",
          "area",
          "address",
        ])
      ) {
        form.setError("root", { message: storeErrorText(err) });
      }
    }
  });

  const selectClass = cn(inputClass, "appearance-none pr-9");
  const chevron = (
    <ChevronDown
      aria-hidden
      strokeWidth={1.5}
      className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
    />
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        {...returnFocus}
        className="max-w-[calc(100%-2rem)] gap-5 rounded-none border border-border bg-card p-5 ring-0 sm:max-w-xl"
      >
        <DialogTitle className="type-display-sm">
          {address ? ta.editAddress : ta.addAddress}
        </DialogTitle>
        <form
          onSubmit={onSubmit}
          noValidate
          className="grid gap-5 sm:grid-cols-2"
        >
          <CheckoutField
            id="ad-name"
            label={ta.recipient}
            error={errors.name?.message}
          >
            <input
              id="ad-name"
              autoComplete="name"
              maxLength={60}
              aria-invalid={Boolean(errors.name)}
              className={inputClass}
              {...form.register("name")}
            />
          </CheckoutField>
          <CheckoutField
            id="ad-phone"
            label={ta.phone}
            error={errors.phone?.message}
          >
            <input
              id="ad-phone"
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
            id="ad-zone"
            label={ta.zone}
            error={errors.zoneId?.message}
          >
            <div className="relative">
              <select
                id="ad-zone"
                aria-invalid={Boolean(errors.zoneId)}
                className={selectClass}
                {...form.register("zoneId")}
              >
                <option value="">—</option>
                {zones.data?.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
              {chevron}
            </div>
          </CheckoutField>
          <CheckoutField
            id="ad-district"
            label={ta.district}
            error={errors.district?.message}
          >
            <div className="relative">
              <select
                id="ad-district"
                autoComplete="address-level2"
                aria-invalid={Boolean(errors.district)}
                className={selectClass}
                {...form.register("district")}
              >
                <option value="">{ta.chooseDistrict}</option>
                {BD_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {chevron}
            </div>
          </CheckoutField>
          <CheckoutField
            id="ad-area"
            label={ta.area}
            error={errors.area?.message}
            className="sm:col-span-2"
          >
            <input
              id="ad-area"
              autoComplete="address-level3"
              maxLength={80}
              aria-invalid={Boolean(errors.area)}
              className={inputClass}
              {...form.register("area")}
            />
          </CheckoutField>
          <CheckoutField
            id="ad-address"
            label={ta.address}
            hint={ta.addressHint}
            error={errors.address?.message}
            className="sm:col-span-2"
          >
            <input
              id="ad-address"
              autoComplete="street-address"
              maxLength={200}
              aria-invalid={Boolean(errors.address)}
              className={inputClass}
              {...form.register("address")}
            />
          </CheckoutField>
          <label className="flex min-h-11 items-center gap-3 type-mono-label sm:col-span-2">
            <input
              type="checkbox"
              className="size-5 accent-primary"
              {...form.register("isDefault")}
            />
            {ta.makeDefault}
          </label>
          {errors.root?.message && (
            <div className="sm:col-span-2">
              <Notice tone="error">{errors.root.message}</Notice>
            </div>
          )}
          <div className="flex justify-end gap-3 sm:col-span-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 rounded-none px-5 type-mono-label uppercase"
            >
              {ta.cancel}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 rounded-none px-5 type-mono-label uppercase"
            >
              {isSubmitting ? ta.saving : ta.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
