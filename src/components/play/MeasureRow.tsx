"use client";

import { Check, ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import type { Dataset } from "@/lib/dataset";
import type { DistrictId, Indicator, Measure } from "@/lib/types";
import type { RelationHint } from "@/lib/ui/cabinet";
import { formatDelta } from "@/lib/ui/format";
import { EFFECT_LABELS } from "@/lib/ui/labels";
import { cn } from "@/lib/utils";
import { MeasureDetails } from "./MeasureDetails";
import { RowNotes } from "./RowNotes";

export interface MeasureRowProps {
  measure: Measure;
  ds: Dataset;
  selected: boolean;
  districtId?: DistrictId;
  hints: RelationHint[]; // synergy/conflict notes against the current set only
  blockedReason?: string; // when set and not selected, the row cannot be picked
  onToggle(): void;
  onDistrictChange(id: DistrictId): void;
}

const ROW_BUTTON = cn(
  "grid min-w-0 flex-1 grid-cols-[1.25rem_1fr_2rem] items-baseline gap-x-3 gap-y-0.5 rounded-md px-2 py-2 text-left",
  "outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 enabled:hover:bg-muted/70",
  "disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none sm:grid-cols-[1.25rem_1fr_auto_2rem]",
);
const MARK = "grid size-5 place-items-center self-start rounded-full border border-input";
const DETAILS_BUTTON = cn(
  "inline-flex shrink-0 items-center gap-0.5 rounded-md px-2 py-2 text-sm text-muted-foreground outline-none",
  "transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none",
);

/** The largest effect in plain words: «+16 к школам и детсадам». */
function mainEffect(measure: Measure): string {
  const effects = Object.entries(measure.effects) as [Indicator, number][];
  const [code, value] = effects.reduce((a, b) => (b[1] > a[1] ? b : a));
  return `${formatDelta(value, 0)} ${EFFECT_LABELS[code]}`;
}

export function MeasureRow({
  measure,
  ds,
  selected,
  districtId,
  hints,
  blockedReason,
  onToggle,
  onDistrictChange,
}: MeasureRowProps) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const blocked = Boolean(blockedReason) && !selected;
  return (
    <li title={blocked ? blockedReason : undefined} className={cn("py-1", selected && "bg-accent/50")}>
      <div className="flex items-center gap-1">
        <button type="button" aria-pressed={selected} disabled={blocked} onClick={onToggle} className={ROW_BUTTON}>
          <span aria-hidden className={cn(MARK, selected && "border-primary bg-primary text-primary-foreground")}>
            {selected && <Check className="size-3" />}
          </span>
          <span className={cn("leading-snug", selected && "font-medium")}>
            {measure.title}
            {measure.scope === "city" && (
              <span className="text-sm font-normal text-muted-foreground"> · весь город</span>
            )}
          </span>
          <span className="col-start-2 row-start-2 text-sm text-muted-foreground sm:col-start-auto sm:row-start-auto">
            {mainEffect(measure)}
          </span>
          <span className="text-right text-sm font-medium tabular-nums">
            {measure.cost}
            <span className="sr-only"> у.е.</span>
          </span>
        </button>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          aria-label={`подробнее: ${measure.title}`}
          onClick={() => setOpen((v) => !v)}
          className={DETAILS_BUTTON}
        >
          <span className="sr-only sm:not-sr-only">подробнее</span>
          <ChevronDown aria-hidden className={cn("size-3.5", open && "rotate-180")} />
        </button>
      </div>
      <RowNotes
        measureTitle={measure.title}
        needsDistrict={selected && measure.scope === "district"}
        districtId={districtId}
        hints={hints}
        onDistrictChange={onDistrictChange}
      />
      <MeasureDetails id={detailsId} measure={measure} ds={ds} open={open} />
    </li>
  );
}
