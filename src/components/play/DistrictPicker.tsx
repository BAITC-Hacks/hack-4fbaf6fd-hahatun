"use client";

import { DISTRICT_LABELS, type DistrictId } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DistrictPickerProps {
  measureTitle: string;
  value?: DistrictId;
  onChange(id: DistrictId): void;
}

const DISTRICT_IDS = Object.keys(DISTRICT_LABELS) as DistrictId[];

export function DistrictPicker({ measureTitle, value, onChange }: DistrictPickerProps) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className={value ? "text-muted-foreground" : "font-medium text-destructive"}>
        {value ? "Район" : "Укажите район"}
      </span>
      <select
        aria-label={`Район для «${measureTitle}»`}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value as DistrictId)}
        className={cn(
          "h-8 rounded-md border border-input bg-card px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          !value && "border-destructive text-destructive",
        )}
      >
        {!value && (
          <option value="" disabled>
            не выбран
          </option>
        )}
        {DISTRICT_IDS.map((id) => (
          <option key={id} value={id}>
            {DISTRICT_LABELS[id]}
          </option>
        ))}
      </select>
    </label>
  );
}
