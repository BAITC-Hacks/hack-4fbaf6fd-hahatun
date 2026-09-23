import { MEASURE_BY_ID } from "@/lib/data";
import { DEFAULT_DATASET, type Dataset } from "@/lib/dataset";
import { scoreOf, validate } from "@/lib/engine";
import {
  DECISIONS_COUNT,
  type Decision,
  type Direction,
  type Measure,
  type MeasureId,
  type ValidationError,
  type ValidationResult,
} from "@/lib/types";
import { humanizeText, namesOf } from "./humanize";
import { EFFECT_LABELS } from "./labels";
import { directionCounts } from "./scenario";

export interface CabinetSummary {
  validation: ValidationResult;
  score: number | null; // engine score, only for a valid set
  errors: ValidationError[]; // what the panel shows to the player
  directionCounts: Record<Direction, number>;
}

/** Live state of the set: validator on every change, engine score only once the set is valid. */
export function summarizeSet(decisions: Decision[], ds: Dataset = DEFAULT_DATASET): CabinetSummary {
  const validation = validate({ decisions }, ds);
  // An unfinished set is normal while picking; COUNT is shown only when the player goes over the limit.
  const errors = validation.errors
    .filter((e) => e.code !== "COUNT" || decisions.length > DECISIONS_COUNT)
    .map((e) => ({ ...e, message: humanizeText(e.message, namesOf(ds)) }));
  return {
    validation,
    score: validation.ok ? scoreOf(decisions, [], ds) : null,
    errors,
    directionCounts: directionCounts(decisions, measureById(ds)),
  };
}

export interface RelationHint {
  tone: "synergy" | "conflict";
  text: string;
}

export function measureById(ds: Dataset): Record<MeasureId, Measure> {
  if (ds === DEFAULT_DATASET) return MEASURE_BY_ID;
  return Object.fromEntries(ds.measures.map((m) => [m.id, m])) as Record<MeasureId, Measure>;
}

/** Synergy and conflict notes for one measure, only against measures already in the set. */
export function relationHints(id: MeasureId, decisions: Decision[], ds: Dataset = DEFAULT_DATASET): RelationHint[] {
  const chosen = new Set(decisions.map((d) => d.measureId));
  const byId = measureById(ds);
  const partner = (pair: [MeasureId, MeasureId]) => (pair[0] === id ? pair[1] : pair[0]);
  const title = (pair: [MeasureId, MeasureId]) => byId[partner(pair)].title;
  const live = <T extends { pair: [MeasureId, MeasureId] }>(list: T[]) =>
    list.filter((r) => r.pair.includes(id) && chosen.has(partner(r.pair)));
  return [
    ...live(ds.synergies).map((s): RelationHint => ({
      tone: "synergy",
      text: `Вместе с «${title(s.pair)}»: +${s.bonus} ${EFFECT_LABELS[s.indicator]}`,
    })),
    ...live(ds.conflicts).map((c): RelationHint => ({
      tone: "conflict",
      text: `Нельзя вместе с «${title(c.pair)}»${c.sameDistrictOnly ? " в одном районе" : ""}`,
    })),
  ];
}

/** Keeps what the cabinet can edit: known measures, once each, district only for district measures. */
export function sanitizeDecisions(decisions: Decision[]): Decision[] {
  const seen = new Set<string>();
  const out: Decision[] = [];
  for (const d of decisions) {
    const measure = MEASURE_BY_ID[d.measureId];
    if (!measure || seen.has(d.measureId)) continue;
    seen.add(d.measureId);
    out.push(
      measure.scope === "district" && d.districtId
        ? { measureId: d.measureId, districtId: d.districtId }
        : { measureId: d.measureId },
    );
  }
  return out;
}
