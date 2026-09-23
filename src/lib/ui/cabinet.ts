import { CONFLICTS, MEASURE_BY_ID, SYNERGIES } from "@/lib/data";
import { scoreOf, validate } from "@/lib/engine";
import {
  DECISIONS_COUNT,
  type Decision,
  type Direction,
  type MeasureId,
  type ValidationError,
  type ValidationResult,
} from "@/lib/types";
import { humanizeText } from "./humanize";
import { EFFECT_LABELS } from "./labels";
import { directionCounts } from "./scenario";

export interface CabinetSummary {
  validation: ValidationResult;
  score: number | null; // engine score, only for a valid set
  errors: ValidationError[]; // what the panel shows to the player
  directionCounts: Record<Direction, number>;
}

/** Live state of the set: validator on every change, engine score only once the set is valid. */
export function summarizeSet(decisions: Decision[]): CabinetSummary {
  const validation = validate({ decisions });
  // An unfinished set is normal while picking; COUNT is shown only when the player goes over the limit.
  const errors = validation.errors
    .filter((e) => e.code !== "COUNT" || decisions.length > DECISIONS_COUNT)
    .map((e) => ({ ...e, message: humanizeText(e.message) }));
  return {
    validation,
    score: validation.ok ? scoreOf(decisions) : null,
    errors,
    directionCounts: directionCounts(decisions, MEASURE_BY_ID),
  };
}

export interface RelationHint {
  tone: "synergy" | "conflict";
  text: string;
}

/** Synergy and conflict notes for one measure, only against measures already in the set. */
export function relationHints(id: MeasureId, decisions: Decision[]): RelationHint[] {
  const chosen = new Set(decisions.map((d) => d.measureId));
  const partner = (pair: [MeasureId, MeasureId]) => (pair[0] === id ? pair[1] : pair[0]);
  const title = (pair: [MeasureId, MeasureId]) => MEASURE_BY_ID[partner(pair)].title;
  const live = <T extends { pair: [MeasureId, MeasureId] }>(list: T[]) =>
    list.filter((r) => r.pair.includes(id) && chosen.has(partner(r.pair)));
  return [
    ...live(SYNERGIES).map((s): RelationHint => ({
      tone: "synergy",
      text: `Вместе с «${title(s.pair)}»: +${s.bonus} ${EFFECT_LABELS[s.indicator]}`,
    })),
    ...live(CONFLICTS).map((c): RelationHint => ({
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
    out.push(measure.scope === "district" && d.districtId ? { measureId: d.measureId, districtId: d.districtId } : { measureId: d.measureId });
  }
  return out;
}
