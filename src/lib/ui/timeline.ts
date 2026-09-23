import type { Dataset } from "@/lib/dataset";
import { valuesAtQuarter } from "@/lib/engine/timeline";
import { HORIZON_QUARTERS, type DistrictResult, type Scenario } from "@/lib/types";

export interface QuarterView {
  quarter: number;
  districts: DistrictResult[]; // "after" replaced by values at the quarter, "before" stays the baseline
  score: number;
  nCrit: number;
}

// District results as they stand by quarter q. At the horizon the engine districts are returned untouched
// (the per-quarter model matches them there), so the default view is exactly what the engine computed.
export function quarterView(districts: DistrictResult[], scenario: Scenario, quarter: number, ds?: Dataset): QuarterView {
  const v = valuesAtQuarter(scenario, quarter, ds);
  if (v.quarter === HORIZON_QUARTERS) return { quarter: v.quarter, districts, score: v.score, nCrit: v.nCrit };
  return {
    quarter: v.quarter,
    districts: districts.map((d) => ({ ...d, after: v.districts[d.id].indicators, dAfter: v.districts[d.id].d })),
    score: v.score,
    nCrit: v.nCrit,
  };
}

/** "Старт" for q = 0, otherwise "Квартал q · год N". */
export function quarterLabel(q: number): string {
  if (q <= 0) return "Старт";
  return `Квартал ${q} · год ${q <= 4 ? 1 : 2}`;
}
