import { CONFLICTS, MEASURE_BY_ID, SYNERGIES } from "@/lib/data";
import { HORIZON_QUARTERS, type Indicator, type Measure, type MeasureId } from "@/lib/types";
import { formatDelta } from "@/lib/ui/format";
import { EFFECT_LABELS } from "@/lib/ui/labels";

interface MeasureDetailsProps {
  id: string;
  measure: Measure;
  open: boolean;
}

/** Everything the row leaves out: all effects with codes, the lag in words, every synergy and conflict rule. */
export function MeasureDetails({ id, measure, open }: MeasureDetailsProps) {
  const other = (pair: [MeasureId, MeasureId]) => MEASURE_BY_ID[pair[0] === measure.id ? pair[1] : pair[0]].title;
  const effects = Object.entries(measure.effects) as [Indicator, number][];
  const quarters = measure.lag === 1 ? "квартал" : "квартала";
  return (
    <div id={id} hidden={!open} className="pr-2 pb-3 pl-10 text-sm leading-relaxed text-muted-foreground">
      <p>
        {effects.map(([code, value]) => (
          <span key={code}>
            {" · "}
            {formatDelta(value, 0)} {EFFECT_LABELS[code]} <span className="font-mono text-xs">{code}</span>
          </span>
        ))}
      </p>
      <p>
        Заработает через {measure.lag} {quarters}, к концу срока даст {HORIZON_QUARTERS - measure.lag}/{HORIZON_QUARTERS}{" "}
        эффекта.
      </p>
      {SYNERGIES.filter((s) => s.pair.includes(measure.id)).map((s) => (
        <p key={s.pair.join()}>
          Вместе с «{other(s.pair)}»: +{s.bonus} {EFFECT_LABELS[s.indicator]}.
        </p>
      ))}
      {CONFLICTS.filter((c) => c.pair.includes(measure.id)).map((c) => (
        <p key={c.pair.join()}>
          Нельзя вместе с «{other(c.pair)}»{c.sameDistrictOnly ? " в одном районе" : ""}: {c.reason}.
        </p>
      ))}
    </div>
  );
}
