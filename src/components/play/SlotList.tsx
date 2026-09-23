"use client";

import { X } from "lucide-react";
import type { Dataset } from "@/lib/dataset";
import { DECISIONS_COUNT, DISTRICT_LABELS, type Decision, type MeasureId } from "@/lib/types";
import { measureById } from "@/lib/ui/cabinet";

interface SlotListProps {
  decisions: Decision[];
  ds: Dataset;
  onRemove(id: MeasureId): void;
}

/** Five numbered slots: chosen measures in pick order, then empty ones. */
export function SlotList({ decisions, ds, onRemove }: SlotListProps) {
  const byId = measureById(ds);
  const slots = Array.from({ length: Math.max(DECISIONS_COUNT, decisions.length) }, (_, i) => decisions[i]);
  return (
    <ol aria-label="Выбранные меры" className="divide-y divide-border border-y border-border">
      {slots.map((d, i) => {
        const measure = d && byId[d.measureId];
        return (
          <li key={d?.measureId ?? `empty-${i}`} className="flex min-h-11 items-center gap-3 py-1.5 text-sm">
            <span className="w-3 shrink-0 text-muted-foreground tabular-nums">{i + 1}</span>
            {measure ? (
              <>
                <span className="min-w-0 flex-1 leading-snug">
                  {measure.title}
                  {measure.scope === "district" &&
                    (d.districtId ? (
                      <span className="text-muted-foreground"> · {DISTRICT_LABELS[d.districtId]}</span>
                    ) : (
                      <span className="text-destructive"> · укажите район</span>
                    ))}
                </span>
                <button
                  type="button"
                  aria-label={`Убрать «${measure.title}»`}
                  onClick={() => onRemove(measure.id)}
                  className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </>
            ) : (
              <span className="text-muted-foreground">пусто</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
