import type { Decision, DistrictResult, EngineResult, Outcome, Run } from "@/lib/types";
import { CRITICAL_THRESHOLD, DISTRICT_LABELS } from "@/lib/types";
import { formatScore, trendOf } from "./format";
import { namesOf, type MeasureNames } from "./humanize";
import { DISTRICT_IN } from "./labels";
import { encodeDecisions } from "./scenario";

const OUTCOME_VERB: Record<Outcome, string> = {
  approve: "Консилиум утвердил набор",
  approve_with_conditions: "Консилиум утвердил набор с условиями",
  return: "Консилиум вернул набор на доработку",
};

const SCORE_CHANGE = { up: "Score вырос", down: "Score снизился", flat: "Score не изменился" } as const;

/** Indicator values below the threshold before any measure, the base for N_crit. */
export function baseCriticals(districts: DistrictResult[]): number {
  return districts.reduce(
    (n, d) => n + Object.values(d.before).filter((v) => v < CRITICAL_THRESHOLD).length,
    0,
  );
}

function criticalsPhrase(now: number, before: number): string {
  if (now === 0) return before === 0 ? "критических значений нет" : `критических значений не осталось (было ${before})`;
  if (now === before) return `критических значений по-прежнему ${now}`;
  return `критических значений ${now} вместо ${before}`;
}

// The district that was weakest before the measures: did the set lift it?
function weakestPhrase(districts: DistrictResult[]): string {
  const d = districts.reduce((a, b) => (b.dBefore < a.dBefore ? b : a));
  const name = `слабейший район ${DISTRICT_LABELS[d.id]}`;
  const [before, after] = [formatScore(d.dBefore), formatScore(d.dAfter)];
  const trend = trendOf(d.dAfter - d.dBefore);
  if (trend === "up") return `${name} поднялся с ${before} до ${after}`;
  if (trend === "down") return `${name} опустился с ${before} до ${after}`;
  return `${name} не изменился (${before})`;
}

/** One plain sentence for the verdict, built by code from the engine numbers and the outcome. */
export function verdictSentence(engine: EngineResult, outcome: Outcome): string {
  const score = SCORE_CHANGE[trendOf(engine.delta)];
  const crit = criticalsPhrase(engine.nCrit, baseCriticals(engine.districts));
  return `${OUTCOME_VERB[outcome]}: ${score}, ${crit}, ${weakestPhrase(engine.districts)}.`;
}

/** First sentence of an LLM text, for one-line previews. */
export function firstSentence(text: string): string {
  return text.trim().split(/(?<=[.!?…])\s+/u)[0] ?? "";
}

export interface NextStep {
  change: string;
  score: number;
  delta: number;
  href: string;
}

/** Up to three one-swap improvements: the arbiter's mandates, else the optimizer's list. */
export function nextSteps(run: Pick<Run, "id" | "resolution" | "optimizer">): NextStep[] {
  const { mandates } = run.resolution;
  if (mandates.length > 0) {
    return mandates.slice(0, 3).map(({ improvement: { change, score, delta } }, i) => ({
      change,
      score,
      delta,
      href: `/play?from=${encodeURIComponent(run.id)}&mandate=${i}`,
    }));
  }
  return run.optimizer.improvements.slice(0, 3).map(({ change, score, delta, scenario }) => ({
    change,
    score,
    delta,
    href: `/play?s=${encodeDecisions(scenario.decisions)}`,
  }));
}

export interface OptimumGap {
  gap: number;
  isOptimal: boolean;
  swaps: string[];
  href: string;
}

const sameDecision = (a: Decision, b: Decision) => a.measureId === b.measureId && a.districtId === b.districtId;

// "чистое топливо в Сарыарке"; city-wide measures have no district.
function measurePhrase(d: Decision, names: MeasureNames): string {
  const name = names[d.measureId];
  return d.districtId ? `${name} ${DISTRICT_IN[d.districtId]}` : name;
}

function districtName(d: Decision): string {
  return d.districtId ? DISTRICT_LABELS[d.districtId] : "весь город";
}

/** Human-readable differences between the user's set and the optimum, paired greedily in list order. */
function optimumSwaps(mine: Decision[], best: Decision[], names: MeasureNames): string[] {
  const out = mine.filter((d) => !best.some((b) => sameDecision(d, b)));
  const add = best.filter((b) => !mine.some((d) => sameDecision(d, b)));
  const swaps: string[] = [];
  // Same measure in another district: "школа и детсад: Есиль → Нура".
  for (const d of [...out]) {
    const moved = add.find((b) => b.measureId === d.measureId);
    if (!moved) continue;
    swaps.push(`${names[d.measureId]}: ${districtName(d)} → ${districtName(moved)}`);
    out.splice(out.indexOf(d), 1);
    add.splice(add.indexOf(moved), 1);
  }
  const pairs = Math.min(out.length, add.length);
  for (let i = 0; i < pairs; i++) swaps.push(`${measurePhrase(out[i], names)} → ${measurePhrase(add[i], names)}`);
  for (const d of out.slice(pairs)) swaps.push(`убрать ${measurePhrase(d, names)}`);
  for (const b of add.slice(pairs)) swaps.push(`добавить ${measurePhrase(b, names)}`);
  return swaps;
}

/** How far the user's set is from the best valid one, and what to swap to get there. */
export function optimumGap(run: Pick<Run, "scenario" | "engine" | "optimizer" | "sandbox">): OptimumGap {
  const { bestScore, bestScenario } = run.optimizer;
  const gap = bestScore - run.engine.score;
  const isOptimal = gap < 0.005;
  return {
    gap,
    isOptimal,
    swaps: isOptimal ? [] : optimumSwaps(run.scenario.decisions, bestScenario.decisions, namesOf(run.sandbox?.dataset)),
    href: `/play?s=${encodeDecisions(bestScenario.decisions)}`,
  };
}
