import type { DistrictResult, EngineResult, Outcome, Run } from "@/lib/types";
import { CRITICAL_THRESHOLD, DISTRICT_LABELS } from "@/lib/types";
import { formatScore, trendOf } from "./format";
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
