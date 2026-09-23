import { DISTRICTS, INDICATORS, MEASURE_BY_ID, SCORE_WEIGHTS, SYNERGIES, WEIGHTS } from "@/lib/data";
import {
  CRITICAL_THRESHOLD,
  DISTRICT_LABELS,
  HORIZON_QUARTERS,
  type CityShock,
  type Decision,
  type DistrictId,
  type EngineResult,
  type Indicator,
  type Scenario,
} from "@/lib/types";

type Values = Record<DistrictId, Record<Indicator, number>>;

function baseValues(): Values {
  const out = {} as Values;
  for (const d of DISTRICTS) out[d.id] = { ...d.indicators };
  return out;
}

function clip(x: number): number {
  return Math.min(100, Math.max(0, x));
}

// Applies measure effects with the lag factor and fixed synergy bonuses. Source: dataset.md §3 step 1.
// Optional A14 shocks are added after measures and synergies, before the clip to 0..100.
export function applyDecisions(decisions: Decision[], shocks: CityShock[] = []): { values: Values; synergies: string[] } {
  const values = baseValues();
  for (const dec of decisions) {
    const m = MEASURE_BY_ID[dec.measureId];
    if (!m) continue;
    const factor = (HORIZON_QUARTERS - m.lag) / HORIZON_QUARTERS;
    const targets: DistrictId[] = m.scope === "city" ? DISTRICTS.map((d) => d.id) : dec.districtId ? [dec.districtId] : [];
    for (const t of targets) {
      for (const [k, v] of Object.entries(m.effects) as [Indicator, number][]) {
        values[t][k] += v * factor;
      }
    }
  }
  const districtOf = new Map(decisions.map((d) => [d.measureId, d.districtId]));
  const synergies: string[] = [];
  for (const s of SYNERGIES) {
    const [a, b] = s.pair;
    if (!districtOf.has(a) || !districtOf.has(b)) continue;
    const target = districtOf.get(a);
    if (!target) continue;
    values[target][s.indicator] += s.bonus;
    synergies.push(`${a}+${b}: ${s.indicator} +${s.bonus} в ${DISTRICT_LABELS[target]}`);
  }
  for (const sh of shocks) values[sh.districtId][sh.indicator] += sh.delta;
  for (const d of DISTRICTS) for (const k of INDICATORS) values[d.id][k] = clip(values[d.id][k]);
  return { values, synergies };
}

function districtScore(v: Record<Indicator, number>): number {
  return INDICATORS.reduce((s, k) => s + WEIGHTS[k] * v[k], 0);
}

function scoreFromValues(values: Values) {
  const dScores = {} as Record<DistrictId, number>;
  let dAvg = 0;
  for (const d of DISTRICTS) {
    dScores[d.id] = districtScore(values[d.id]);
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
export function scoreOf(decisions: Decision[], shocks: CityShock[] = []): number {
  return scoreFromValues(applyDecisions(decisions, shocks).values).score;
}

export function calculate(scenario: Scenario, shocks: CityShock[] = []): EngineResult {
  const base = scoreFromValues(baseValues());
  const { values, synergies } = applyDecisions(scenario.decisions, shocks);
  const after = scoreFromValues(values);
  const baseVals = baseValues();
  const contributions = scenario.decisions.map((_, i) => {
    const without = scenario.decisions.filter((_, j) => j !== i);
    return { measureId: scenario.decisions[i].measureId, delta: after.score - scoreOf(without, shocks) };
  });
  return {
    baseScore: base.score,
    score: after.score,
    delta: after.score - base.score,
    dAvg: after.dAvg,
    minDistrict: { id: after.minId, value: after.dScores[after.minId] },
    nCrit: after.criticals.length,
    criticals: after.criticals,
    districts: DISTRICTS.map((d) => ({
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
