import { DISTRICTS, INDICATORS, MEASURE_BY_ID, SCORE_WEIGHTS, SYNERGIES, WEIGHTS } from "@/lib/data";
import {
  CRITICAL_THRESHOLD,
  HORIZON_QUARTERS,
  type Decision,
  type DistrictId,
  type Indicator,
  type Scenario,
} from "@/lib/types";

// Per-quarter view of the same model as engine.ts. A measure with lag L starts working in quarter L+1
// and ramps linearly, so by quarter q it has delivered max(0, q - L) / 8 of its full effect; at q = 8 this
// equals the engine's (8 - L) / 8. Synergies switch on once both measures of the pair are active.

export interface QuarterValues {
  quarter: number;
  districts: Record<DistrictId, { indicators: Record<Indicator, number>; d: number }>;
  score: number;
  nCrit: number;
}

const clip = (x: number) => Math.min(100, Math.max(0, x));

export function valuesAtQuarter(scenario: Scenario, quarter: number): QuarterValues {
  const q = Math.max(0, Math.min(HORIZON_QUARTERS, Math.round(quarter)));
  const values = {} as Record<DistrictId, Record<Indicator, number>>;
  for (const d of DISTRICTS) values[d.id] = { ...d.indicators };

  const active = new Set<Decision["measureId"]>();
  for (const dec of scenario.decisions) {
    const m = MEASURE_BY_ID[dec.measureId];
    if (!m) continue;
    const factor = Math.max(0, q - m.lag) / HORIZON_QUARTERS;
    if (factor <= 0) continue;
    active.add(m.id);
    const targets: DistrictId[] = m.scope === "city" ? DISTRICTS.map((d) => d.id) : dec.districtId ? [dec.districtId] : [];
    for (const t of targets) {
      for (const [k, v] of Object.entries(m.effects) as [Indicator, number][]) values[t][k] += v * factor;
    }
  }
  const districtOf = new Map(scenario.decisions.map((d) => [d.measureId, d.districtId]));
  for (const s of SYNERGIES) {
    const [a, b] = s.pair;
    if (!active.has(a) || !active.has(b)) continue;
    const target = districtOf.get(a);
    if (target) values[target][s.indicator] += s.bonus;
  }

  const districts = {} as QuarterValues["districts"];
  let dAvg = 0;
  let min = Infinity;
  let nCrit = 0;
  for (const d of DISTRICTS) {
    const indicators = {} as Record<Indicator, number>;
    let dScore = 0;
    for (const k of INDICATORS) {
      const v = clip(values[d.id][k]);
      indicators[k] = v;
      dScore += WEIGHTS[k] * v;
      if (v < CRITICAL_THRESHOLD) nCrit += 1;
    }
    districts[d.id] = { indicators, d: dScore };
    dAvg += d.population * dScore;
    min = Math.min(min, dScore);
  }
  const score = SCORE_WEIGHTS.cityAverage * dAvg + SCORE_WEIGHTS.weakestDistrict * min - SCORE_WEIGHTS.criticalPenalty * nCrit;
  return { quarter: q, districts, score, nCrit };
}

export function scoreAtQuarter(scenario: Scenario, quarter: number): number {
  return valuesAtQuarter(scenario, quarter).score;
}

export function timeline(scenario: Scenario): QuarterValues[] {
  return Array.from({ length: HORIZON_QUARTERS + 1 }, (_, q) => valuesAtQuarter(scenario, q));
}
