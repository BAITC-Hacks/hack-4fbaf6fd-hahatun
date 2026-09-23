import { MEASURE_BY_ID } from "@/lib/data";
import { scoreOf, validate } from "@/lib/engine";
import {
  DECISIONS_COUNT,
  type Decision,
  type Direction,
  type ValidationError,
  type ValidationResult,
} from "@/lib/types";
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
  const errors = validation.errors.filter((e) => e.code !== "COUNT" || decisions.length > DECISIONS_COUNT);
  return {
    validation,
    score: validation.ok ? scoreOf(decisions) : null,
    errors,
    directionCounts: directionCounts(decisions, MEASURE_BY_ID),
  };
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
