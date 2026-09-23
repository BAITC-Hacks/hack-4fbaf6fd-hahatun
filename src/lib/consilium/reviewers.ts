import "server-only";
import { z } from "zod";
import { scoreOf, validate } from "@/lib/engine";
import { REVIEW_PASS_THRESHOLD, type Draft, type Fact, type Review, type ReviewCondition } from "@/lib/types";
import { callStructured, isLlmEnabled, type LlmUsage } from "./llm";
import { allowedNumbers, foreignNumbers, sentenceWith } from "./numbers";

export interface ReviewInput { draft: Draft; facts: Fact[]; userScore: number; round: number }

export const REVIEW_PROMPT_VERSION = "review-v1";

export const REVIEW_PROMPT_V1 = `Ты — ревизор консилиума городского симулятора. Проверяешь черновик заключения по четырём условиям:
C3 — назван слабейший район и объяснено, почему он слабейший.
C4 — у каждой из пяти мер сценария описан эффект (что она меняет).
C5 — есть минимум один риск и минимум один компромисс, и у компромисса названа причина.
C6 — нет утверждений о механизмах или показателях, которых нет среди фактов (например, туризм, занятость, цены).
Для каждого условия верни id, при провале quote — точную цитату из черновика, reason — короткое объяснение по-русски, затем passed.
Верни ровно четыре условия: C3, C4, C5, C6. Будь строгим, но не придирайся к стилю.`;

const LLM_IDS = ["C3", "C4", "C5", "C6"] as const;
type LlmConditionId = (typeof LLM_IDS)[number];

const llmReviewSchema = z.object({
  conditions: z.array(
    z.object({
      id: z.enum(LLM_IDS),
      quote: z.string().nullable(),
      reason: z.string(),
      passed: z.boolean(),
    }),
  ),
});

export async function review(input: ReviewInput, usage: LlmUsage): Promise<Review> {
  let llmConditions: ReviewCondition[];
  if (isLlmEnabled()) {
    try {
      llmConditions = await checkWithLlm(input, usage);
    } catch {
      // LLM failure is recorded in usage.traces; the run must not die here (plan.md §2 p.5).
      llmConditions = checkWithHeuristics(input).map((c) => ({ ...c, reason: `${c.reason} (LLM недоступен, эвристика)` }));
    }
  } else {
    llmConditions = checkWithHeuristics(input);
  }
  const conditions = [checkNumbers(input), checkRecommendation(input), ...llmConditions];
  const passed = conditions.filter((c) => c.passed).length;
  return { round: input.round, conditions, passed, total: 6, ok: passed >= REVIEW_PASS_THRESHOLD };
}

function draftSegments(draft: Draft): string[] {
  return [draft.text, ...draft.strengths, ...draft.risks, ...draft.consequences, draft.recommendation.text];
}

// C1: every number in the draft is a fact value or a number quoted in a fact text.
export function checkNumbers(input: Pick<ReviewInput, "draft" | "facts">): ReviewCondition {
  const allowed = allowedNumbers(input.facts);
  let total = 0;
  const foreign: { raw: string; quote: string }[] = [];
  for (const segment of draftSegments(input.draft)) {
    total += foreignNumbers(segment, []).length;
    for (const t of foreignNumbers(segment, allowed)) foreign.push({ raw: t.raw, quote: sentenceWith(segment, t.raw) });
  }
  if (foreign.length === 0) {
    return { id: "C1", by: "code", passed: true, reason: `Все ${total} чисел найдены среди фактов` };
  }
  const list = [...new Set(foreign.map((f) => f.raw))].join(", ");
  return { id: "C1", by: "code", passed: false, reason: `Числа вне фактов: ${list}`, quote: foreign[0].quote };
}

// C2: the recommended improvement is a valid scenario that beats the user's score.
export function checkRecommendation(input: Pick<ReviewInput, "draft" | "facts" | "userScore">): ReviewCondition {
  const fail = (reason: string): ReviewCondition => ({ id: "C2", by: "code", passed: false, reason });
  const improvement = input.draft.recommendation.improvement;
  if (!improvement) {
    const hasImprovements = input.facts.some((f) => f.text.startsWith("Улучшение №"));
    if (hasImprovements) return fail("Оптимизатор нашёл улучшения, но рекомендация не содержит ни одного");
    return { id: "C2", by: "code", passed: true, reason: "Улучшений не найдено, рекомендация не требуется" };
  }
  const validation = validate(improvement.scenario);
  if (!validation.ok) return fail(`Рекомендованный набор невалиден: ${validation.errors.map((e) => e.message).join("; ")}`);
  const score = scoreOf(improvement.scenario.decisions);
  const fmt = (x: number) => String(Math.round(x * 100) / 100);
  if (score <= input.userScore) return fail(`Рекомендация не лучше исходного набора: ${fmt(score)} ≤ ${fmt(input.userScore)}`);
  return { id: "C2", by: "code", passed: true, reason: `Рекомендация валидна, ${fmt(score)} > ${fmt(input.userScore)}` };
}

interface ScenarioMeasure { id: string; title?: string }

// Measures come from the "Вклад Mx «title» в Score" facts, one per scenario decision.
export function scenarioMeasures(facts: Fact[]): ScenarioMeasure[] {
  const out: ScenarioMeasure[] = [];
  for (const f of facts) {
    const m = /^Вклад (M\d+)(?: «([^»]+)»)?/.exec(f.text);
    if (m && !out.some((x) => x.id === m[1])) out.push({ id: m[1], ...(m[2] ? { title: m[2] } : {}) });
  }
  return out;
}

export function weakestDistrict(facts: Fact[]): string | undefined {
  const f = facts.find((x) => x.text.startsWith("Слабейший район "));
  return f?.text.slice("Слабейший район ".length).split(":")[0].trim() || undefined;
}

function buildPrompt(input: ReviewInput): string {
  const measures = scenarioMeasures(input.facts).map((m) => `- ${m.id}${m.title ? ` «${m.title}»` : ""}`).join("\n");
  const facts = input.facts.map((f) => `${f.id}: ${f.text}`).join("\n");
  const d = input.draft;
  return [
    `Слабейший район: ${weakestDistrict(input.facts) ?? "не указан в фактах"}`,
    `Пять мер сценария:\n${measures || "- не найдены в фактах"}`,
    `Факты:\n${facts}`,
    `Черновик v${d.version}:\n${d.text}`,
    `Сильные стороны:\n${d.strengths.map((s) => `- ${s}`).join("\n")}`,
    `Риски:\n${d.risks.map((s) => `- ${s}`).join("\n")}`,
    `Последствия:\n${d.consequences.map((s) => `- ${s}`).join("\n")}`,
    `Рекомендация: ${d.recommendation.text}`,
  ].join("\n\n");
}

async function checkWithLlm(input: ReviewInput, usage: LlmUsage): Promise<ReviewCondition[]> {
  const result = await callStructured(
    {
      role: "reviewers",
      tier: "judge",
      reasoning: "low",
      system: REVIEW_PROMPT_V1,
      prompt: buildPrompt(input),
      schema: llmReviewSchema,
      promptVersion: REVIEW_PROMPT_VERSION,
    },
    usage,
  );
  return LLM_IDS.map((id): ReviewCondition => {
    const c = result.conditions.find((x) => x.id === id);
    if (!c) return { id, by: "llm", passed: false, reason: "Ревизор не вернул условие" };
    return { id, by: "llm", passed: c.passed, reason: c.reason, ...(c.quote ? { quote: c.quote } : {}) };
  });
}

const HEURISTIC_NOTE = "(эвристика без LLM)";

// Keyless mode: cheap text checks instead of the LLM judge, marked in every reason.
export function checkWithHeuristics(input: Pick<ReviewInput, "draft" | "facts">): ReviewCondition[] {
  const full = draftSegments(input.draft).join("\n");
  const lower = full.toLowerCase();
  const cond = (id: LlmConditionId, passed: boolean, reason: string): ReviewCondition => ({
    id, by: "llm", passed, reason: `${reason} ${HEURISTIC_NOTE}`,
  });

  const weakest = weakestDistrict(input.facts);
  const hasCause = ["потому что", "так как", "поскольку", "из-за", "поэтому", "причина"].some((w) => lower.includes(w));
  const c3 = weakest && full.includes(weakest) && hasCause;

  const missing = scenarioMeasures(input.facts)
    .filter((m) => !new RegExp(`(?<![\\p{L}\\p{N}])${m.id}(?!\\p{N})`, "u").test(full))
    .filter((m) => !m.title || !lower.includes(m.title.toLowerCase()))
    .map((m) => m.id);

  const hasRisk = lower.includes("риск");
  const hasTradeoff = ["компромисс", "ценой", "взамен"].some((w) => lower.includes(w));

  return [
    cond("C3", Boolean(c3), c3
      ? `Слабейший район ${weakest} назван с причиной`
      : `Не найдено название слабейшего района${weakest ? ` (${weakest})` : ""} вместе с причиной`),
    cond("C4", missing.length === 0, missing.length === 0
      ? "Все меры сценария упомянуты"
      : `Не упомянуты меры: ${missing.join(", ")}`),
    cond("C5", hasRisk && hasTradeoff, hasRisk && hasTradeoff
      ? "Есть риск и компромисс"
      : `Не найдено: ${[!hasRisk && "риск", !hasTradeoff && "компромисс"].filter(Boolean).join(" и ")}`),
    { id: "C6", by: "llm", passed: true, reason: "Проверено эвристикой без LLM" },
  ];
}
