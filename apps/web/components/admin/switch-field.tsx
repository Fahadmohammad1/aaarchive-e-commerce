"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type SwitchFieldProps = {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

/** A labelled on/off setting with a 44px tap target. */
export function SwitchField({
  id,
  label,
  checked,
  onCheckedChange,
}: SwitchFieldProps) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
