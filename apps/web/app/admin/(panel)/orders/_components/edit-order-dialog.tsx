"use client";

import { BD_DISTRICTS } from "@aaarchive/shared/checkout";
import { formatTaka } from "@aaarchive/shared/money";
import type { OrderEditInput } from "@aaarchive/shared/order";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import * as React from "react";
import { FormField } from "@/components/admin/form-field";
import { NativeSelect } from "@/components/admin/native-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useZones } from "@/lib/delivery-zone/use-delivery-zones";
import { errorText } from "@/lib/i18n/error-text";
import { format } from "@/lib/i18n/i18n";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import type { AdminOrder } from "@/lib/order/order-schemas";
import { useEditOrder } from "@/lib/order/use-admin-orders";
import { useProduct, useProducts } from "@/lib/product/use-products";

type Line = {
  variantId: string;
  label: string;
  quantity: number;
  /** Known for kept lines; new lines are priced by the API on save. */
  unitPrice: number | null;
};

/** Edit before shipping (PRD §6.4). Sends only what changed. */
export function EditOrderDialog({
  order,
  open,
  onOpenChange,
}: {
  order: AdminOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = getAdminMessages();
  const to = t.orders;
  const edit = useEditOrder(order.id);
  const zones = useZones();
  const [lines, setLines] = React.useState<Line[]>([]);
  const [fields, setFields] = React.useState({
    customerName: "",
    zoneId: "",
    district: "",
    area: "",
    address: "",
    deliveryCharge: 0,
  });
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setLines(
      order.items
        .filter((i) => i.variantId)
        .map((i) => ({
          variantId: i.variantId as string,
          label: `${i.productName} — ${i.colorName} / ${i.sizeName}`,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
    );
    setFields({
      customerName: order.customerName,
      zoneId: order.zone.id,
      district: order.district,
      area: order.area,
      address: order.address,
      deliveryCharge: order.deliveryCharge,
    });
  }, [open, order]);

  const set = <K extends keyof typeof fields>(
    key: K,
    value: (typeof fields)[K],
  ) => setFields((f) => ({ ...f, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const body: OrderEditInput = {};
    const before = order.items
      .filter((i) => i.variantId)
      .map((i) => `${i.variantId}:${i.quantity}`)
      .sort()
      .join();
    const after = lines
      .map((l) => `${l.variantId}:${l.quantity}`)
      .sort()
      .join();
    if (before !== after) {
      body.items = lines.map((l) => ({
        variantId: l.variantId,
        quantity: l.quantity,
      }));
    }
    if (fields.customerName !== order.customerName)
      body.customerName = fields.customerName;
    if (fields.zoneId !== order.zone.id) body.zoneId = fields.zoneId;
    if (fields.district !== order.district) {
      body.district = fields.district as OrderEditInput["district"];
    }
    if (fields.area !== order.area) body.area = fields.area;
    if (fields.address !== order.address) body.address = fields.address;
    if (fields.deliveryCharge !== order.deliveryCharge) {
      body.deliveryCharge = fields.deliveryCharge;
    }
    if (Object.keys(body).length === 0) {
      onOpenChange(false);
      return;
    }
    try {
      await edit.mutateAsync(body);
      onOpenChange(false);
    } catch (e) {
      setError(errorText(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {format(to.editTitle, { number: order.orderNumber })}
          </DialogTitle>
          <DialogDescription>{to.editHint}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-medium text-sm">
              {to.itemsTitle}
            </legend>
            <ul className="flex flex-col gap-2">
              {lines.map((line) => (
                <li
                  key={line.variantId}
                  className="flex items-center gap-2 rounded-md border p-2"
                >
                  <span className="min-w-0 flex-1 text-sm">
                    {line.label}
                    {line.unitPrice != null && (
                      <span className="block font-mono text-muted-foreground text-xs">
                        {formatTaka(line.unitPrice)}
                      </span>
                    )}
                  </span>
                  <div className="flex items-center rounded-md border">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-lg"
                      aria-label={t.common.edit}
                      disabled={line.quantity <= 1}
                      onClick={() =>
                        setLines((ls) =>
                          ls.map((l) =>
                            l.variantId === line.variantId
                              ? { ...l, quantity: l.quantity - 1 }
                              : l,
                          ),
                        )
                      }
                    >
                      <Minus />
                    </Button>
                    <span className="w-8 text-center font-mono">
                      {line.quantity}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-lg"
                      aria-label={t.common.edit}
                      disabled={line.quantity >= 99}
                      onClick={() =>
                        setLines((ls) =>
                          ls.map((l) =>
                            l.variantId === line.variantId
                              ? { ...l, quantity: l.quantity + 1 }
                              : l,
                          ),
                        )
                      }
                    >
                      <Plus />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    aria-label={format(to.removeItem, { name: line.label })}
                    disabled={lines.length <= 1}
                    onClick={() =>
                      setLines((ls) =>
                        ls.filter((l) => l.variantId !== line.variantId),
                      )
                    }
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
            <AddItem
              exclude={lines.map((l) => l.variantId)}
              onAdd={(line) => setLines((ls) => [...ls, line])}
            />
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="edit-name" label={to.name}>
              <Input
                id="edit-name"
                className="h-11"
                maxLength={60}
                value={fields.customerName}
                onChange={(e) => set("customerName", e.target.value)}
              />
            </FormField>
            <FormField id="edit-zone" label={to.zone}>
              <NativeSelect
                id="edit-zone"
                value={fields.zoneId}
                onChange={(e) => {
                  const zone = zones.data?.data.find(
                    (z) => z.id === e.target.value,
                  );
                  set("zoneId", e.target.value);
                  if (zone) set("deliveryCharge", zone.charge);
                }}
              >
                {zones.data?.data.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="edit-district" label={to.district}>
              <NativeSelect
                id="edit-district"
                value={fields.district}
                onChange={(e) => set("district", e.target.value)}
              >
                {BD_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="edit-area" label={to.area}>
              <Input
                id="edit-area"
                className="h-11"
                maxLength={80}
                value={fields.area}
                onChange={(e) => set("area", e.target.value)}
              />
            </FormField>
            <FormField id="edit-address" label={to.address}>
              <Input
                id="edit-address"
                className="h-11"
                maxLength={200}
                value={fields.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </FormField>
            <FormField id="edit-delivery" label={to.delivery}>
              <Input
                id="edit-delivery"
                type="number"
                inputMode="numeric"
                min={0}
                className="h-11 font-mono"
                value={fields.deliveryCharge}
                onChange={(e) =>
                  set(
                    "deliveryCharge",
                    Math.max(0, Number(e.target.value) || 0),
                  )
                }
              />
            </FormField>
          </div>
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
            <Button type="submit" size="lg" disabled={edit.isPending}>
              {edit.isPending ? t.saving : t.common.saveChanges}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Search a product, then pick one of its active variants. */
function AddItem({
  exclude,
  onAdd,
}: {
  exclude: string[];
  onAdd: (line: Line) => void;
}) {
  const to = getAdminMessages().orders;
  const [q, setQ] = React.useState("");
  const [productId, setProductId] = React.useState<string | null>(null);
  const products = useProducts({
    q: q.trim() || undefined,
    limit: 8,
    status: "PUBLISHED",
  });
  const product = useProduct(productId);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed p-2">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setProductId(null);
          }}
          placeholder={to.addItemSearch}
          aria-label={to.addItem}
          className="h-11 pl-8"
        />
      </div>
      {q.trim() && !productId && (
        <ul className="flex flex-col">
          {products.data?.data.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="min-h-11 w-full rounded px-2 text-left text-sm hover:bg-accent"
                onClick={() => setProductId(p.id)}
              >
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {product.data && (
        <ul className="flex flex-col">
          {product.data.variants
            .filter((v) => v.isActive && !exclude.includes(v.id))
            .map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  disabled={v.stock <= 0}
                  className="flex min-h-11 w-full items-center justify-between rounded px-2 text-left text-sm hover:bg-accent disabled:opacity-50"
                  onClick={() => {
                    onAdd({
                      variantId: v.id,
                      label: `${product.data.name} — ${v.colorName} / ${v.sizeName}`,
                      quantity: 1,
                      unitPrice: null,
                    });
                    setQ("");
                    setProductId(null);
                  }}
                >
                  <span>
                    {v.colorName} / {v.sizeName}
                  </span>
                  <span className="font-mono text-muted-foreground text-xs">
                    {v.sku} · {v.stock}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
