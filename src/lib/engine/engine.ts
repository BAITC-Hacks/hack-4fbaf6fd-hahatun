import { INDICATORS, SCORE_WEIGHTS } from "@/lib/data";
import { DEFAULT_DATASET, type Dataset } from "@/lib/dataset";
import {
  CRITICAL_THRESHOLD,
  DISTRICT_LABELS,
  HORIZON_QUARTERS,
  type CityShock,
  type Decision,
  type DistrictId,
  type EngineResult,
  type Indicator,
  type Measure,
  type Scenario,
} from "@/lib/types";

type Values = Record<DistrictId, Record<Indicator, number>>;

function baseValues(ds: Dataset): Values {
  const out = {} as Values;
  for (const d of ds.districts) out[d.id] = { ...d.indicators };
  return out;
}

const measureIndexCache = new WeakMap<Dataset, Map<string, Measure>>();

/** Measure lookup by id for a dataset, memoised per dataset object. */
export function measureIndex(ds: Dataset): Map<string, Measure> {
  let m = measureIndexCache.get(ds);
  if (!m) {
    m = new Map(ds.measures.map((x) => [x.id, x]));
    measureIndexCache.set(ds, m);
  }
  return m;
}

function clip(x: number): number {
  return Math.min(100, Math.max(0, x));
}

// Applies measure effects with the lag factor and fixed synergy bonuses. Source: dataset.md §3 step 1.
// Optional A14 shocks are added after measures and synergies, before the clip to 0..100.
export function applyDecisions(
  decisions: Decision[],
  shocks: CityShock[] = [],
  ds: Dataset = DEFAULT_DATASET,
): { values: Values; synergies: string[] } {
  const values = baseValues(ds);
  const byId = measureIndex(ds);
  for (const dec of decisions) {
    const m = byId.get(dec.measureId);
    if (!m) continue;
    const factor = (HORIZON_QUARTERS - m.lag) / HORIZON_QUARTERS;
    const targets: DistrictId[] = m.scope === "city" ? ds.districts.map((d) => d.id) : dec.districtId ? [dec.districtId] : [];
    for (const t of targets) {
      for (const [k, v] of Object.entries(m.effects) as [Indicator, number][]) {
        values[t][k] += v * factor;
      }
    }
  }
  const districtOf = new Map(decisions.map((d) => [d.measureId, d.districtId]));
  const synergies: string[] = [];
  for (const s of ds.synergies) {
    const [a, b] = s.pair;
    if (!districtOf.has(a) || !districtOf.has(b)) continue;
    const target = districtOf.get(a);
    if (!target) continue;
    values[target][s.indicator] += s.bonus;
    synergies.push(`${a}+${b}: ${s.indicator} +${s.bonus} в ${DISTRICT_LABELS[target]}`);
  }
  for (const sh of shocks) values[sh.districtId][sh.indicator] += sh.delta;
  for (const d of ds.districts) for (const k of INDICATORS) values[d.id][k] = clip(values[d.id][k]);
  return { values, synergies };
}

function districtScore(v: Record<Indicator, number>, weights: Record<Indicator, number>): number {
  return INDICATORS.reduce((s, k) => s + weights[k] * v[k], 0);
}

function scoreFromValues(values: Values, ds: Dataset) {
  const DISTRICTS = ds.districts;
  const dScores = {} as Record<DistrictId, number>;
  let dAvg = 0;
  for (const d of DISTRICTS) {
    dScores[d.id] = districtScore(values[d.id], ds.weights);
    dAvg += d.population * dScores[d.id];
  }
  let minId: DistrictId = DISTRICTS[0].id;
  for (const d of DISTRICTS) if (dScores[d.id] < dScores[minId]) minId = d.id;
  const criticals: EngineResult["criticals"] = [];
  for (const d of DISTRICTS) {
    for (const k of INDICATORS) {
      if (values[d.id][k] < CRITICAL_THRESHOLD) criticals.push({ districtId: d.id, indicator: k, value: values[d.id][k] });
    }
  }
  const score =
    SCORE_WEIGHTS.cityAverage * dAvg + SCORE_WEIGHTS.weakestDistrict * dScores[minId] - SCORE_WEIGHTS.criticalPenalty * criticals.length;
  return { score, dAvg, dScores, minId, criticals };
}

// Fast path for the optimizer: only the number.
export function scoreOf(decisions: Decision[], shocks: CityShock[] = [], ds: Dataset = DEFAULT_DATASET): number {
  return scoreFromValues(applyDecisions(decisions, shocks, ds).values, ds).score;
}

export function calculate(scenario: Scenario, shocks: CityShock[] = [], ds: Dataset = DEFAULT_DATASET): EngineResult {
  const base = scoreFromValues(baseValues(ds), ds);
  const { values, synergies } = applyDecisions(scenario.decisions, shocks, ds);
  const after = scoreFromValues(values, ds);
  const baseVals = baseValues(ds);
  const contributions = scenario.decisions.map((_, i) => {
    const without = scenario.decisions.filter((_, j) => j !== i);
    return { measureId: scenario.decisions[i].measureId, delta: after.score - scoreOf(without, shocks, ds) };
  });
  return {
    baseScore: base.score,
    score: after.score,
    delta: after.score - base.score,
    dAvg: after.dAvg,
    minDistrict: { id: after.minId, value: after.dScores[after.minId] },
    nCrit: after.criticals.length,
    criticals: after.criticals,
    districts: ds.districts.map((d) => ({
      id: d.id,
      before: baseVals[d.id],
      after: values[d.id],
      dBefore: base.dScores[d.id],
      dAfter: after.dScores[d.id],
    })),
    contributions,
    synergies,
  };
}
