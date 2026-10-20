"use client";

import type { SalesReportQuery } from "@aaarchive/shared/report";
import * as React from "react";
import { NativeSelect } from "@/components/admin/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAdminMessages } from "@/lib/i18n/i18n-admin";
import {
  RANGE_PRESETS,
  type RangePreset,
  validCustomRange,
} from "./analytics-range";

type RangeFilterProps = {
  preset: RangePreset;
  query: Required<SalesReportQuery>;
  onPreset: (preset: Exclude<RangePreset, "custom">) => void;
  onCustom: (range: Required<SalesReportQuery>) => void;
};

/** Period picker: presets, or two dates applied together. */
export function RangeFilter({
  preset,
  query,
  onPreset,
  onCustom,
}: RangeFilterProps) {
  const t = getAdminMessages().analytics;
  const [custom, setCustom] = React.useState(preset === "custom");
  const [from, setFrom] = React.useState(query.from);
  const [to, setTo] = React.useState(query.to);
  const [invalid, setInvalid] = React.useState(false);

  const apply = (event: React.FormEvent) => {
    event.preventDefault();
    const range = validCustomRange(from, to);
    setInvalid(!range);
    if (range) onCustom(range);
  };

  return (
    <form
      onSubmit={apply}
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <div className="flex flex-col gap-1">
        <Label htmlFor="analytics-range">{t.range}</Label>
        <NativeSelect
          id="analytics-range"
          className="sm:w-44"
          value={custom ? "custom" : preset}
          onChange={(event) => {
            const value = event.target.value as RangePreset;
            if (value === "custom") {
              setFrom(query.from);
              setTo(query.to);
              setCustom(true);
              return;
            }
            setCustom(false);
            setInvalid(false);
            onPreset(value);
          }}
        >
          {RANGE_PRESETS.map((p) => (
            <option key={p} value={p}>
              {t.ranges[p]}
            </option>
          ))}
        </NativeSelect>
      </div>
      {custom && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <div className="flex flex-col gap-1">
              <Label htmlFor="analytics-from">{t.from}</Label>
              <Input
                id="analytics-from"
                type="date"
                value={from}
                max={to}
                aria-invalid={invalid}
                onChange={(event) => setFrom(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="analytics-to">{t.to}</Label>
              <Input
                id="analytics-to"
                type="date"
                value={to}
                min={from}
                aria-invalid={invalid}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>
          </div>
          <Button type="submit" size="lg">
            {t.apply}
          </Button>
          {invalid && (
            <p role="alert" className="text-destructive text-xs sm:basis-full">
              {t.rangeError}
            </p>
          )}
        </>
      )}
    </form>
  );
}
