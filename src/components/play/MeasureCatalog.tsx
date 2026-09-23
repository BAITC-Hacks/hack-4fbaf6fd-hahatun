"use client";

import { CONFLICTS, MEASURES, SYNERGIES } from "@/lib/data";
import {
  DIRECTION_CAP,
  DIRECTION_LABELS,
  type Decision,
  type Direction,
  type DistrictId,
  type MeasureId,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { MeasureCard } from "./MeasureCard";

interface MeasureCatalogProps {
  decisions: Decision[];
  counts: Record<Direction, number>;
  blockedReason?: string; // applied to cards that are not selected
  onToggle(id: MeasureId): void;
  onDistrictChange(id: MeasureId, district: DistrictId): void;
}

const BY_NUMBER = (a: { id: string }, b: { id: string }) => Number(a.id.slice(1)) - Number(b.id.slice(1));

const SECTIONS = (Object.keys(DIRECTION_LABELS) as Direction[]).map((direction) => ({
  direction,
  measures: MEASURES.filter((m) => m.direction === direction).sort(BY_NUMBER),
}));

export function MeasureCatalog({ decisions, counts, blockedReason, onToggle, onDistrictChange }: MeasureCatalogProps) {
  const chosen = new Map(decisions.map((d) => [d.measureId, d]));
  return (
    <div className="flex flex-col gap-8">
      {SECTIONS.map(({ direction, measures }) => {
        const n = counts[direction] ?? 0;
        return (
          <section key={direction} aria-labelledby={`dir-${direction}`} className="flex flex-col gap-3">
            <header className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
              <h2 id={`dir-${direction}`} className="font-display text-lg font-semibold">
                {DIRECTION_LABELS[direction]}
              </h2>
              <p
                className={cn(
                  "text-xs text-muted-foreground tabular-nums",
                  n === DIRECTION_CAP && "text-foreground",
                  n > DIRECTION_CAP && "font-medium text-destructive",
                )}
              >
                {n}/{DIRECTION_CAP} выбрано
              </p>
            </header>
            <div className="grid gap-3 lg:grid-cols-2">
              {measures.map((m) => (
                <MeasureCard
                  key={m.id}
                  measure={m}
                  synergies={SYNERGIES}
                  conflicts={CONFLICTS}
                  selected={chosen.has(m.id)}
                  districtId={chosen.get(m.id)?.districtId}
                  blockedReason={blockedReason}
                  onToggle={() => onToggle(m.id)}
                  onDistrictChange={(district) => onDistrictChange(m.id, district)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
