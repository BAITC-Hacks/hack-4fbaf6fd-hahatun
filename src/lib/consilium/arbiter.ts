import "server-only";
import { z } from "zod";
import { DIRECTION_LABELS, type Draft, type EngineResult, type ExpertOpinion, type ExpertRole, type Fact, type Improvement, type Outcome, type Resolution, type Review } from "@/lib/types";
import { callStructured, isLlmEnabled, type LlmUsage } from "./llm";

export interface ArbiterInput {
  engine: EngineResult; facts: Fact[]; opinions: ExpertOpinion[]; draft: Draft; review: Review; improvements: Improvement[];
}

export const ARBITER_PROMPT_VERSION = "arbiter-v1";

export const ARBITER_PROMPT_V1 = `Ты — арбитр консилиума городского симулятора. Исход уже выбран кодом по правилам: не меняй его, а объясни.
Задачи:
1. disputes — только там, где эксперты расходятся по одной теме или мере. Для каждого спора: topic, factRefs (ID фактов, на которые опираешься), reason, затем sideTaken — роль эксперта, чью сторону ты принимаешь.
2. justification — 2–4 предложения, почему исход именно такой, опираясь на факты. Используй только числа из фактов.
3. mandates — поручения только из пронумерованного списка улучшений: improvementIndex — номер в квадратных скобках, text — формулировка поручения.
4. caveat — если ревизия прошла не 6 из 6, коротко предупреди, какие условия не выполнены.`;

const OUTCOME_LABELS: Record<Outcome, string> = {
  approve: "утвердить",
  approve_with_conditions: "утвердить с условиями",
  return: "вернуть на доработку",
};

const ROLE_LABELS: Record<ExpertRole, string> = { ...DIRECTION_LABELS, finance: "Финансы" };
const ROLES = ["transport", "ecology", "social", "safety", "service", "finance"] as const satisfies readonly ExpertRole[];

const arbiterSchema = z.object({
  disputes: z.array(z.object({ topic: z.string(), factRefs: z.array(z.string()), reason: z.string(), sideTaken: z.enum(ROLES) })),
  justification: z.string(),
  mandates: z.array(z.object({ improvementIndex: z.number().int(), text: z.string() })),
  caveat: z.string().optional(),
});
type ArbiterOutput = z.infer<typeof arbiterSchema>;

// plan.md §7: a failed review returns the draft regardless of the numbers.
export function decideOutcome(engine: EngineResult, review: Review): Outcome {
  if (!review.ok || engine.delta <= 0) return "return";
  const weakest = engine.districts.find((d) => d.id === engine.minDistrict.id);
  const weakestGrew = weakest !== undefined && weakest.dAfter > weakest.dBefore;
  return engine.nCrit === 0 && weakestGrew ? "approve" : "approve_with_conditions";
}

export async function arbitrate(input: ArbiterInput, usage: LlmUsage): Promise<Resolution> {
  const outcome = decideOutcome(input.engine, input.review);
  const draft = isLlmEnabled() ? await callArbiter(input, outcome, usage) : deterministicResolution(input, outcome);
  return finalize(input, outcome, draft);
}

const r2 = (x: number) => Math.round(x * 100) / 100;

function defaultMandateText(imp: Improvement, outcome: Outcome): string {
  const body = `${imp.change}, расчётный Score ${r2(imp.score)}`;
  return outcome === "approve_with_conditions" ? `Обязательное поручение: ${body}` : `Рассмотреть улучшение: ${body}`;
}

function defaultCaveat(review: Review): string {
  const failed = review.conditions.filter((c) => !c.passed).map((c) => c.id).join(", ");
  return `Проверено ${review.passed} из ${review.total}${failed ? `, не выполнены: ${failed}` : ""}`;
}

// Code gate over the arbiter's output: unknown facts, roles and improvements are dropped.
function finalize(input: ArbiterInput, outcome: Outcome, out: ArbiterOutput): Resolution {
  const factIds = new Set(input.facts.map((f) => f.id));
  const roles = new Set(input.opinions.map((o) => o.role));
  const disputes = out.disputes
    .filter((d) => roles.has(d.sideTaken))
    .map((d) => ({ topic: d.topic, sideTaken: d.sideTaken, reason: d.reason, factRefs: d.factRefs.filter((id) => factIds.has(id)) }));

  const seen = new Set<number>();
  const mandates: Resolution["mandates"] = [];
  for (const m of out.mandates) {
    const imp = input.improvements[m.improvementIndex];
    if (!imp || seen.has(m.improvementIndex)) continue;
    seen.add(m.improvementIndex);
    mandates.push({ improvement: imp, text: m.text });
  }
  if (outcome === "approve_with_conditions" && mandates.length === 0 && input.improvements[0]) {
    mandates.push({ improvement: input.improvements[0], text: defaultMandateText(input.improvements[0], outcome) });
  }

  const resolution: Resolution = { outcome, disputes, justification: out.justification, mandates };
  if (input.review.passed < input.review.total) resolution.caveat = out.caveat?.trim() || defaultCaveat(input.review);
  return resolution;
}

function opposingPairs(opinions: ExpertOpinion[]): [ExpertOpinion, ExpertOpinion][] {
  const supports = opinions.filter((o) => o.stance === "support");
  return opinions
    .filter((o) => o.stance === "concern")
    .flatMap((concern): [ExpertOpinion, ExpertOpinion][] => {
      const shared = supports.find((s) => s.factRefs.some((id) => concern.factRefs.includes(id)));
      const support = shared ?? supports[0];
      return support ? [[support, concern]] : [];
    });
}

function buildPrompt(input: ArbiterInput, outcome: Outcome): string {
  const opinion = (o: ExpertOpinion) =>
    `- ${o.name} (${o.role}, ${ROLE_LABELS[o.role]}), ${o.stance}: ${o.summary} Риск: ${o.risk} Компромисс: ${o.tradeoff} Факты: ${o.factRefs.join(", ") || "—"}`;
  const pairs = opposingPairs(input.opinions).map(([s, c]) => `- ${s.name} (support) против ${c.name} (concern)`).join("\n");
  const review = input.review.conditions.map((c) => `- ${c.id} ${c.passed ? "пройдено" : "провал"}: ${c.reason}`).join("\n");
  const improvements = input.improvements.map((imp, i) => `[${i}] ${imp.change}, Score ${r2(imp.score)} (+${r2(imp.delta)})`).join("\n");
  return [
    `Исход (выбран кодом, не меняй его, объясни): ${outcome} — ${OUTCOME_LABELS[outcome]}`,
    `Факты:\n${input.facts.map((f) => `${f.id}: ${f.text}`).join("\n")}`,
    `Мнения экспертов:\n${input.opinions.map(opinion).join("\n")}`,
    `Пары с противоположной позицией:\n${pairs || "- нет"}`,
    `Финальный черновик v${input.draft.version}:\n${input.draft.text}`,
    `Ревизия: ${input.review.passed} из ${input.review.total}\n${review}${input.review.passed < input.review.total ? "\nРевизия не 6 из 6 — обязательно заполни caveat." : ""}`,
    `Улучшения:\n${improvements || "нет"}`,
  ].join("\n\n");
}

function callArbiter(input: ArbiterInput, outcome: Outcome, usage: LlmUsage): Promise<ArbiterOutput> {
  return callStructured(
    {
      role: "arbiter",
      tier: "judge",
      reasoning: "low",
      system: ARBITER_PROMPT_V1,
      prompt: buildPrompt(input, outcome),
      schema: arbiterSchema,
      promptVersion: ARBITER_PROMPT_VERSION,
    },
    usage,
  );
}

// Keyless mode: justification from F1-F3, disputes from support/concern pairs.
export function deterministicResolution(input: ArbiterInput, outcome: Outcome): ArbiterOutput {
  const head = ["F1", "F2", "F3"].map((id) => input.facts.find((f) => f.id === id)?.text).filter(Boolean);
  const justification = `Исход: ${OUTCOME_LABELS[outcome]}. ${head.join(". ")}${head.length ? "." : ""}`.trim();
  const factIds = new Set(input.facts.map((f) => f.id));
  const disputes = opposingPairs(input.opinions).map(([support, concern]) => {
    const taken = outcome === "approve" ? support : concern;
    return {
      topic: `${support.name} (${ROLE_LABELS[support.role]}) против ${concern.name} (${ROLE_LABELS[concern.role]})`,
      factRefs: [...new Set([...support.factRefs, ...concern.factRefs])].filter((id) => factIds.has(id)),
      reason: `Принята позиция: ${taken.name}. ${taken.summary}`,
      sideTaken: taken.role,
    };
  });
  const first = input.improvements[0];
  const mandates = first ? [{ improvementIndex: 0, text: defaultMandateText(first, outcome) }] : [];
  return { disputes, justification, mandates };
}
