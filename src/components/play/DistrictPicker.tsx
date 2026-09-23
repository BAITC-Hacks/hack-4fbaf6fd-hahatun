"use client";

import { DISTRICT_LABELS, type DistrictId, type MeasureId } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DistrictPickerProps {
  measureId: MeasureId;
  value?: DistrictId;
  onChange(id: DistrictId): void;
}

const DISTRICT_IDS = Object.keys(DISTRICT_LABELS) as DistrictId[];

export function DistrictPicker({ measureId, value, onChange }: DistrictPickerProps) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-border px-4 py-3">
      <p className={cn("text-xs", value ? "text-muted-foreground" : "text-destructive")}>
        {value ? "Район" : "Укажите район"}
      </p>
      <div role="group" aria-label={`Район для ${measureId}`} className="flex flex-wrap gap-1">
        {DISTRICT_IDS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={value === id}
            onClick={() => onChange(id)}
            className={cn(
              "rounded-md border border-border px-2 py-1 text-xs outline-none transition-colors hover:bg-muted",
              "focus-visible:ring-3 focus-visible:ring-ring/50",
              value === id && "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {DISTRICT_LABELS[id]}
          </button>
        ))}
      </div>
    </div>
  );
}
