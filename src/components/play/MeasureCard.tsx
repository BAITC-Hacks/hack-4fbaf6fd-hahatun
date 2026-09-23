"use client";

import { Building2, Check, Lock, MapPin } from "lucide-react";
import {
  DIRECTION_LABELS,
  HORIZON_QUARTERS,
  INDICATOR_LABELS,
  type Conflict,
  type DistrictId,
  type Indicator,
  type Measure,
  type Synergy,
} from "@/lib/types";
import { formatCost, formatDelta } from "@/lib/ui/format";
import { cn } from "@/lib/utils";
import { DistrictPicker } from "./DistrictPicker";

export interface MeasureCardProps {
  measure: Measure;
  synergies: Synergy[]; // may be the full list, filtered to this measure inside
  conflicts: Conflict[];
  selected: boolean;
  districtId?: DistrictId;
  onToggle(): void;
  onDistrictChange(id: DistrictId): void;
  blockedReason?: string; // when set and not selected, the card cannot be picked
}

function relationBadges(measure: Measure, synergies: Synergy[], conflicts: Conflict[]) {
  const other = (pair: [string, string]) => (pair[0] === measure.id ? pair[1] : pair[0]);
  const syn = synergies
    .filter((s) => s.pair.includes(measure.id))
    .map((s) => ({
      key: `s-${s.pair.join()}`,
      text: `синергия с ${other(s.pair)} (+${s.bonus} ${s.indicator})`,
      title: `${INDICATOR_LABELS[s.indicator]}: бонус в районе ${s.pair[0]}, без учёта лага`,
    }));
  const con = conflicts
    .filter((c) => c.pair.includes(measure.id))
    .map((c) => ({
      key: `c-${c.pair.join()}`,
      text: `конфликт с ${other(c.pair)}${c.sameDistrictOnly ? " в одном районе" : ""}`,
      title: c.reason,
    }));
  return { syn, con };
}

function EffectChip({ code, value }: { code: Indicator; value: number }) {
  return (
    <span
      title={INDICATOR_LABELS[code]}
      className={cn(
        "rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs tabular-nums",
        value < 0 && "bg-destructive/10 text-destructive",
      )}
    >
      {formatDelta(value, 0)} {code}
    </span>
  );
}

type Rel = { key: string; text: string; title: string };

function RelationBadges({ syn, con }: { syn: Rel[]; con: Rel[] }) {
  if (syn.length === 0 && con.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {syn.map((b) => (
        <span key={b.key} title={b.title} className="rounded-full bg-sky/10 px-2 py-0.5 text-xs text-sky">
          {b.text}
        </span>
      ))}
      {con.map((b) => (
        <span key={b.key} title={b.title} className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
          {b.text}
        </span>
      ))}
    </span>
  );
}

function CardBody({ measure, synergies, conflicts, selected }: Pick<MeasureCardProps, "measure" | "synergies" | "conflicts" | "selected">) {
  const { syn, con } = relationBadges(measure, synergies, conflicts);
  const realized = HORIZON_QUARTERS - measure.lag;
  const ScopeIcon = measure.scope === "city" ? Building2 : MapPin;
  return (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn(
              "grid size-5 place-items-center rounded-full border border-input",
              selected && "border-primary bg-primary text-primary-foreground",
            )}
          >
            {selected && <Check className="size-3" />}
          </span>
          <span className="font-mono text-xs text-muted-foreground">{measure.id}</span>
          <span className="text-xs text-muted-foreground">{DIRECTION_LABELS[measure.direction]}</span>
        </span>
        <span className="font-display text-base font-semibold tabular-nums">{formatCost(measure.cost)}</span>
      </span>
      <span className="text-sm leading-snug font-medium">{measure.title}</span>
      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <ScopeIcon className="size-3.5" aria-hidden />
          {measure.scope === "city" ? "весь город" : "район"}
        </span>
        <span className="tabular-nums" title={`(${HORIZON_QUARTERS} − ${measure.lag}) / ${HORIZON_QUARTERS} = ${realized}/${HORIZON_QUARTERS} эффекта за горизонт`}>
          лаг {measure.lag} кв. · эффект ({HORIZON_QUARTERS} − {measure.lag})/{HORIZON_QUARTERS} = {realized}/{HORIZON_QUARTERS}
        </span>
      </span>
      <span className="flex flex-wrap gap-1">
        {(Object.entries(measure.effects) as [Indicator, number][]).map(([k, v]) => (
          <EffectChip key={k} code={k} value={v} />
        ))}
      </span>
      <RelationBadges syn={syn} con={con} />
    </>
  );
}

export function MeasureCard(props: MeasureCardProps) {
  const { measure, selected, districtId, onToggle, onDistrictChange, blockedReason } = props;
  const blocked = Boolean(blockedReason) && !selected;
  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow",
        "has-[>button:focus-visible]:ring-3 has-[>button:focus-visible]:ring-ring/50",
        selected && "border-primary ring-1 ring-primary",
        blocked && "opacity-60",
      )}
    >
      <button
        type="button"
        aria-pressed={selected}
        disabled={blocked}
        onClick={onToggle}
        className="flex flex-col gap-2 p-4 text-left outline-none enabled:hover:bg-muted/40 disabled:cursor-not-allowed"
      >
        <CardBody {...props} />
        {blocked && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="size-3" aria-hidden />
            {blockedReason}
          </span>
        )}
      </button>
      {selected && measure.scope === "district" && (
        <DistrictPicker measureId={measure.id} value={districtId} onChange={onDistrictChange} />
      )}
    </article>
  );
}
