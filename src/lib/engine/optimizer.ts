import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { CONFLICTS, DISTRICTS, INDICATORS, MEASURES, MEASURE_BY_ID, SCORE_WEIGHTS, SYNERGIES, WEIGHTS } from "@/lib/data";
import { scoreOf } from "./engine";
import { validate } from "./validator";
import {
  BUDGET,
  CRITICAL_THRESHOLD,
  DECISIONS_COUNT,
  DIRECTION_CAP,
  DISTRICT_LABELS,
  HORIZON_QUARTERS,
  type Decision,
  type Direction,
  type Improvement,
  type OptimizerResult,
  type Scenario,
} from "@/lib/types";

const EPS = 1e-9;
// Cache version is a fingerprint of the dataset and rules: editing measures, weights, synergies,
// conflicts or the budget invalidates data/optimum.json automatically.
const CACHE_VERSION = `v1-${createHash("sha256")
  .update(JSON.stringify({ MEASURES, DISTRICTS, WEIGHTS, SCORE_WEIGHTS, SYNERGIES, CONFLICTS, BUDGET, DIRECTION_CAP }))
  .digest("hex")
  .slice(0, 12)}`;

// ---------------------------------------------------------------------------
// Precomputed tables: measures, districts and indicators as indices, effects as flat numbers.
// ---------------------------------------------------------------------------

const N_M = MEASURES.length;
const N_D = DISTRICTS.length;
const N_I = INDICATORS.length;
const DIRECTIONS: Direction[] = ["transport", "ecology", "social", "safety", "service"];

const M_INDEX = new Map(MEASURES.map((m, i) => [m.id, i]));
const D_INDEX = new Map(DISTRICTS.map((d, i) => [d.id, i]));
const M_COST = MEASURES.map((m) => m.cost);
const M_DIR = MEASURES.map((m) => DIRECTIONS.indexOf(m.direction));
const M_DISTRICT = MEASURES.map((m) => m.scope === "district");
// Effect per indicator with the lag factor applied, same arithmetic as applyDecisions.
const M_EFFECT = MEASURES.map((m) => {
  const factor = (HORIZON_QUARTERS - m.lag) / HORIZON_QUARTERS;
  return INDICATORS.map((k) => (m.effects[k] ?? 0) * factor);
});

const BASE = new Float64Array(N_D * N_I);
DISTRICTS.forEach((d, di) => INDICATORS.forEach((k, ki) => (BASE[di * N_I + ki] = d.indicators[k])));
const W = INDICATORS.map((k) => WEIGHTS[k]);
const POP = DISTRICTS.map((d) => d.population);

const PAIR = (list: { pair: [string, string] }[]) =>
  list.map((x) => [M_INDEX.get(x.pair[0] as Decision["measureId"])!, M_INDEX.get(x.pair[1] as Decision["measureId"])!]);
const CONFLICT_PAIRS = PAIR(CONFLICTS);
const CONFLICT_SAME = CONFLICTS.map((c) => c.sameDistrictOnly);
const SYNERGY_PAIRS = PAIR(SYNERGIES);
const SYNERGY_IND = SYNERGIES.map((s) => INDICATORS.indexOf(s.indicator));
const SYNERGY_BONUS = SYNERGIES.map((s) => s.bonus);

// ---------------------------------------------------------------------------
// Fast validity check. `ids` are measure indices, `dists` district indices (-1 = none).
// ---------------------------------------------------------------------------

/** Rules that do not depend on districts: cap per direction, unconditional conflicts, budget. */
function comboOk(ids: readonly number[]): boolean {
  const perDir = [0, 0, 0, 0, 0];
  let cost = 0;
  for (const m of ids) {
    cost += M_COST[m];
    if (++perDir[M_DIR[m]] > DIRECTION_CAP) return false;
  }
  if (cost > BUDGET) return false;
  for (let c = 0; c < CONFLICT_PAIRS.length; c++) {
    if (CONFLICT_SAME[c]) continue;
    if (ids.includes(CONFLICT_PAIRS[c][0]) && ids.includes(CONFLICT_PAIRS[c][1])) return false;
  }
  return true;
}

/** Same-district conflicts (M4/M7, M5/M13). */
function placementOk(ids: readonly number[], dists: readonly number[]): boolean {
  for (let c = 0; c < CONFLICT_PAIRS.length; c++) {
    if (!CONFLICT_SAME[c]) continue;
    const a = ids.indexOf(CONFLICT_PAIRS[c][0]);
    const b = ids.indexOf(CONFLICT_PAIRS[c][1]);
    if (a >= 0 && b >= 0 && dists[a] === dists[b]) return false;
  }
  return true;
}

/** Inline equivalent of `validate(scenario).ok`, checked against it in optimizer.test.ts. */
export function isValidFast(decisions: readonly Decision[]): boolean {
  if (decisions.length !== DECISIONS_COUNT) return false;
  const ids: number[] = [];
  const dists: number[] = [];
  for (const d of decisions) {
    const m = M_INDEX.get(d.measureId);
    if (m === undefined || ids.includes(m)) return false;
    if (M_DISTRICT[m] !== Boolean(d.districtId)) return false;
    const di = d.districtId ? D_INDEX.get(d.districtId) : -1;
    if (di === undefined) return false;
    ids.push(m);
    dists.push(di);
  }
  return comboOk(ids) && placementOk(ids, dists);
}

// ---------------------------------------------------------------------------
// Fast scorer: same model as engine.ts scoreOf, on a flat Float64Array without allocations.
// ---------------------------------------------------------------------------

const scratch = new Float64Array(N_D * N_I);

function addEffect(values: Float64Array, m: number, d: number): void {
  const eff = M_EFFECT[m];
  const from = d < 0 ? 0 : d;
  const to = d < 0 ? N_D : d + 1;
  for (let t = from; t < to; t++) {
    const off = t * N_I;
    for (let k = 0; k < N_I; k++) values[off + k] += eff[k];
  }
}

function scoreValues(values: Float64Array): number {
  let dAvg = 0;
  let dMin = Infinity;
  let crit = 0;
  for (let d = 0; d < N_D; d++) {
    const off = d * N_I;
    let s = 0;
    for (let k = 0; k < N_I; k++) {
      const v = Math.min(100, Math.max(0, values[off + k]));
      if (v < CRITICAL_THRESHOLD) crit++;
      s += W[k] * v;
    }
    dAvg += POP[d] * s;
    if (s < dMin) dMin = s;
  }
  return SCORE_WEIGHTS.cityAverage * dAvg + SCORE_WEIGHTS.weakestDistrict * dMin - SCORE_WEIGHTS.criticalPenalty * crit;
}

/** Score of a set given as index arrays; `cityBase` already holds base values plus city-wide effects. */
function fastScore(ids: readonly number[], dists: readonly number[], cityBase: Float64Array): number {
  scratch.set(cityBase);
  for (let i = 0; i < ids.length; i++) if (dists[i] >= 0) addEffect(scratch, ids[i], dists[i]);
  for (let s = 0; s < SYNERGY_PAIRS.length; s++) {
    const a = ids.indexOf(SYNERGY_PAIRS[s][0]);
    if (a < 0 || dists[a] < 0 || !ids.includes(SYNERGY_PAIRS[s][1])) continue;
    scratch[dists[a] * N_I + SYNERGY_IND[s]] += SYNERGY_BONUS[s];
  }
  return scoreValues(scratch);
}

function toDecisions(ids: readonly number[], dists: readonly number[]): Decision[] {
  return ids.map((m, i) =>
    dists[i] >= 0 ? { measureId: MEASURES[m].id, districtId: DISTRICTS[dists[i]].id } : { measureId: MEASURES[m].id },
  );
}

/** Test hook: fast scorer on a regular decision list, to compare with engine.scoreOf. */
export function fastScoreOf(decisions: readonly Decision[]): number {
  const ids = decisions.map((d) => M_INDEX.get(d.measureId)!);
  const dists = decisions.map((d) => (d.districtId ? D_INDEX.get(d.districtId)! : -1));
  const cityBase = Float64Array.from(BASE);
  ids.forEach((m, i) => dists[i] < 0 && addEffect(cityBase, m, -1));
  return fastScore(ids, dists, cityBase);
}

// ---------------------------------------------------------------------------
// Full enumeration: C(14,5) id combos × districts for district-scope measures.
// ---------------------------------------------------------------------------

export interface Optimum {
  scores: Float64Array; // sorted ascending, rounded to 4 decimals
  bestScore: number;
  bestScenario: Scenario;
  source: "computed" | "disk";
}

const round4 = (x: number) => Math.round(x * 1e4) / 1e4;

function* combinations(n: number, k: number): Generator<number[]> {
  const idx = Array.from({ length: k }, (_, i) => i);
  while (true) {
    yield idx.slice();
    let i = k - 1;
    while (i >= 0 && idx[i] === n - k + i) i--;
    if (i < 0) return;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
}

export function enumerateAll(): Optimum {
  const scores: number[] = [];
  let bestScore = -Infinity;
  let best: Decision[] = [];
  const cityBase = new Float64Array(N_D * N_I);
  const dists = new Array<number>(DECISIONS_COUNT).fill(-1);

  for (const ids of combinations(N_M, DECISIONS_COUNT)) {
    if (!comboOk(ids)) continue;
    cityBase.set(BASE);
    const slots: number[] = [];
    ids.forEach((m, i) => (M_DISTRICT[m] ? slots.push(i) : addEffect(cityBase, m, -1)));
    for (let i = 0; i < ids.length; i++) dists[i] = -1;

    const total = N_D ** slots.length;
    for (let code = 0; code < total; code++) {
      let c = code;
      for (const s of slots) {
        dists[s] = c % N_D;
        c = (c - dists[s]) / N_D;
      }
      if (!placementOk(ids, dists)) continue;
      const score = fastScore(ids, dists, cityBase);
      scores.push(round4(score));
      if (score > bestScore) {
        bestScore = score;
        best = toDecisions(ids, dists);
      }
    }
  }

  const sorted = Float64Array.from(scores).sort();
  return { scores: sorted, bestScore, bestScenario: { decisions: best }, source: "computed" };
}

// ---------------------------------------------------------------------------
// Disk cache + in-memory singleton per cache path.
// ---------------------------------------------------------------------------

interface CacheFile {
  version: string;
  count: number;
  scores: number[];
  bestScore: number;
  bestScenario: Scenario;
  computedAt: string;
}

export function cachePath(): string {
  return process.env.OPTIMUM_CACHE_PATH || path.join(/* turbopackIgnore: true */ process.cwd(), "data", "optimum.json");
}

async function readCache(file: string): Promise<Optimum | null> {
  try {
    const raw = JSON.parse(await readFile(/* turbopackIgnore: true */ file, "utf8")) as Partial<CacheFile>;
    if (raw.version !== CACHE_VERSION || !Array.isArray(raw.scores) || raw.scores.length !== raw.count) return null;
    if (!raw.scores.every((x) => typeof x === "number" && Number.isFinite(x))) return null;
    if (typeof raw.bestScore !== "number" || !raw.bestScenario || !isValidFast(raw.bestScenario.decisions)) return null;
    return { scores: Float64Array.from(raw.scores), bestScore: raw.bestScore, bestScenario: raw.bestScenario, source: "disk" };
  } catch {
    return null; // missing or corrupt file: recompute
  }
}

async function writeCache(file: string, o: Optimum): Promise<void> {
  const body: CacheFile = {
    version: CACHE_VERSION,
    count: o.scores.length,
    scores: Array.from(o.scores),
    bestScore: o.bestScore,
    bestScenario: o.bestScenario,
    computedAt: new Date().toISOString(),
  };
  try {
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(body));
    await rename(tmp, file);
  } catch {
    // Read-only FS or similar: keep working from memory.
  }
}

const optimumByPath = new Map<string, Promise<Optimum>>();

async function loadOrCompute(file: string): Promise<Optimum> {
  const cached = await readCache(file);
  if (cached) return cached;
  const computed = enumerateAll();
  await writeCache(file, computed);
  return computed;
}

/** Full enumeration result, computed once per process (and once per disk cache file). */
export function getOptimum(file: string = cachePath()): Promise<Optimum> {
  let p = optimumByPath.get(file);
  if (!p) {
    p = loadOrCompute(file);
    optimumByPath.set(file, p);
    p.catch(() => optimumByPath.delete(file));
  }
  return p;
}

/** Test hook: forget in-memory results so the next call goes to disk. */
export function resetOptimumMemory(): void {
  optimumByPath.clear();
}

/** Share of valid sets with score <= userScore (binary search, upper bound). */
export function percentileOf(sorted: Float64Array, userScore: number): number {
  if (sorted.length === 0) return 0;
  const x = round4(userScore) + EPS;
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] <= x) lo = mid + 1;
    else hi = mid;
  }
  return lo / sorted.length;
}

// ---------------------------------------------------------------------------
// Single-swap neighbours: "one step away" recommendations.
// ---------------------------------------------------------------------------

// All single-decision replacements: any measure × (its districts, or nothing for city-scope measures).
function buildCandidates(): Decision[] {
  const list: Decision[] = [];
  for (const m of MEASURES) {
    if (m.scope === "city") {
      list.push({ measureId: m.id });
    } else {
      for (const d of DISTRICTS) list.push({ measureId: m.id, districtId: d.id });
    }
  }
  return list;
}

const CANDIDATES = buildCandidates();

function decisionKey(decisions: Decision[]): string {
  return decisions
    .map((d) => `${d.measureId}:${d.districtId ?? ""}`)
    .sort()
    .join("|");
}

// "M5 Сарыарка → M3 Линия ЛРТ / расширение, Нура" / "M12 → M14 ... (город)" / "M7 Есиль → M7 Нура".
function describeChange(before: Decision, after: Decision): string {
  const beforeLabel = `${before.measureId}${before.districtId ? ` ${DISTRICT_LABELS[before.districtId]}` : ""}`;
  let afterLabel: string;
  if (after.measureId === before.measureId) {
    afterLabel = `${after.measureId} ${DISTRICT_LABELS[after.districtId!]}`;
  } else {
    const m = MEASURE_BY_ID[after.measureId];
    afterLabel =
      m.scope === "district"
        ? `${m.id} ${m.title}, ${DISTRICT_LABELS[after.districtId!]}`
        : `${m.id} ${m.title} (город)`;
  }
  return `${beforeLabel} → ${afterLabel}`;
}

function neighbourImprovements(decisions: Decision[], userScore: number): Improvement[] {
  const seen = new Set<string>();
  const found: { decisions: Decision[]; score: number; change: string }[] = [];

  for (let i = 0; i < decisions.length; i++) {
    for (const cand of CANDIDATES) {
      const next = decisions.map((d, j) => (j === i ? cand : d));
      if (!validate({ decisions: next }).ok) continue;
      const score = scoreOf(next);
      if (score <= userScore + EPS) continue;
      const key = decisionKey(next);
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ decisions: next, score, change: describeChange(decisions[i], cand) });
    }
  }

  found.sort((a, b) => b.score - a.score);
  return found.slice(0, 3).map((c) => ({
    scenario: { decisions: c.decisions },
    score: c.score,
    delta: c.score - userScore,
    change: c.change,
  }));
}

// A5: percentile and best score over all valid sets (full enumeration), improvements over single swaps.
export async function optimize(scenario: Scenario): Promise<OptimizerResult> {
  const decisions = scenario.decisions ?? [];
  const userScore = scoreOf(decisions);
  const optimum = await getOptimum();

  return {
    bestScore: optimum.bestScore,
    bestScenario: optimum.bestScenario,
    percentile: percentileOf(optimum.scores, userScore),
    improvements: neighbourImprovements(decisions, userScore),
  };
}
