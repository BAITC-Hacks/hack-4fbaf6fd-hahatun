import { DEFAULT_DATASET, type Dataset } from "@/lib/dataset";
import { measureIndex } from "@/lib/engine/engine";
import {
  DISTRICT_LABELS,
  type Decision,
  type ExpertOpinion,
  type ExpertRole,
  type Fact,
  type Improvement,
  type ReviewCondition,
  type Scenario,
} from "@/lib/types";

// Prompt versions are written into every LLM trace (llm.ts promptFingerprint).
export const EXPERT_PROMPT_VERSION = "expert-v1";
export const SYNTH_PROMPT_VERSION = "synth-v1";

export const EXPERT_NAMES: Record<ExpertRole, string> = {
  transport: "Айгерим",
  ecology: "Ерлан",
  social: "Гульнара",
  safety: "Тимур",
  service: "Дана",
  finance: "Дастан",
};

export const EXPERT_ROLES: ExpertRole[] = ["transport", "ecology", "social", "safety", "service", "finance"];

const EXPERT_COMMON = `Ты участник консилиума, который оценивает набор из пяти городских мер для акима на горизонте 8 кварталов.
Правила:
- Любое число бери только из переданных фактов или описания мер, дословно. Не считай сам и не придумывай показатели.
- Не выдумывай механизмы, которых нет в фактах и описании мер.
- В factRefs перечисли ID фактов (например "F7"), на которые опираешься. Только ID из списка.
- summary, risk, tradeoff — по одному-два коротких предложения на русском, живым языком, без канцелярита.
- Сначала обоснуй (summary, risk, tradeoff), потом вынеси stance: "support" если набор хорош для твоей области, "concern" если нет.
- suggestion — одна мера, которую ты бы добавил или поставил вместо другой, либо null. Для районной меры укажи districtId, для городской districtId = null.`;

const EXPERT_PERSONAS: Record<ExpertRole, string> = {
  transport: `Ты Айгерим, эксперт по транспорту. Твой критерий: T1 (разгрузка дорог) и T2 (доступность общественного транспорта) по районам. Если транспортные показатели не сдвинулись — это твоя главная претензия. Помни, что меры других направлений могут ухудшать T1.`,
  ecology: `Ты Ерлан, эколог. Твой критерий: E1 (озеленение) и E2 (качество воздуха). Смотришь, попали ли меры туда, где воздух и зелень хуже всего, и сколько кварталов эффект ждать.`,
  social: `Ты Гульнара, эксперт по соцсфере. Твой критерий: S1 (школы и детсады) и S2 (поликлиники). Главное для тебя — закрыты ли критические провалы ниже 40 и не остаётся ли район на грани порога.`,
  safety: `Ты Тимур, эксперт по безопасности. Твой критерий: B1 (безопасность улиц) и B2 (безопасность дорожного движения). Отмечаешь сработавшие синергии и районы, где безопасность так и не улучшилась.`,
  service: `Ты Дана, эксперт по городским сервисам и ЖКХ. Твой критерий: C1 (надёжность ЖКХ) и C2 (скорость решения обращений). Отличаешь косметический эффект от реальной надёжности сетей.`,
  finance: `Ты Дастан, финансист. Твой критерий: стоимость набора, остаток бюджета и вклад каждой меры в Score на единицу стоимости. Ищешь меры с худшей отдачей и неиспользованные деньги. Не суди отраслевые показатели — только деньги и отдачу.`,
};

export function expertSystemPrompt(role: ExpertRole): string {
  return `${EXPERT_PERSONAS[role]}\n\n${EXPERT_COMMON}`;
}

// withCost: experts may quote dataset costs; the synthesizer must not (its text is checked against facts only).
export function decisionLabel(d: Decision, withCost = false, ds: Dataset = DEFAULT_DATASET): string {
  const m = measureIndex(ds).get(d.measureId);
  const where = d.districtId ? DISTRICT_LABELS[d.districtId] : "весь город";
  const meta = withCost && m ? `${m.direction}, стоимость ${m.cost}` : (m?.direction ?? "?");
  return `${d.measureId} «${m?.title ?? d.measureId}» (${meta}) — ${where}`;
}

const r2 = (x: number) => Math.round(x * 100) / 100;

export const factLines = (facts: Fact[]) => facts.map((f) => `${f.id}: ${f.text}`).join("\n");

function improvementLines(improvements: Improvement[]): string {
  if (!improvements.length) return "нет";
  return improvements.map((imp, i) => `№${i + 1}: ${imp.change}, Score ${r2(imp.score)} (${imp.delta >= 0 ? "+" : "−"}${Math.abs(r2(imp.delta))})`).join("\n");
}

export function expertUserPrompt(scenario: Scenario, facts: Fact[], improvements: Improvement[], ds: Dataset = DEFAULT_DATASET): string {
  return [
    "Сценарий (5 мер):",
    scenario.decisions.map((d) => `- ${decisionLabel(d, true, ds)}`).join("\n"),
    "",
    "Факты (единственный источник чисел):",
    factLines(facts),
    "",
    "Улучшения, найденные оптимизатором:",
    improvementLines(improvements),
  ].join("\n");
}

export const SYNTH_SYSTEM_PROMPT_V1 = `Ты пишешь заключение консилиума для акима. Любое число — только из фактов, дословно. Не выдумывай механизмы и показатели, которых нет в фактах.
Обязательно:
1. Назови слабейший район и почему он слабейший.
2. Опиши эффект каждой из пяти мер сценария (по фактам вклада и изменений показателей).
3. Минимум один риск и один компромисс, у каждого — причина.
4. Рекомендация — только из переданных улучшений, своих вариантов не предлагай. Если улучшений нет, рекомендуй оставить набор и объясни почему.
Учитывай мнения экспертов, но проверяй их по фактам: если эксперт привёл число, которого нет в фактах, не повторяй его.
Формат: strengths, risks, consequences — по 2-4 коротких пункта; recommendationText — одно-два предложения; text — связный текст 5-9 предложений на русском, без списков и заголовков.`;

function opinionLines(opinions: ExpertOpinion[]): string {
  return opinions
    .map(
      (o) =>
        `- ${o.name} (${o.role}), ${o.stance}: ${o.summary} Риск: ${o.risk} Компромисс: ${o.tradeoff} [${o.factRefs.join(", ")}]`,
    )
    .join("\n");
}

function revisionBlock(previous: { draft: { text: string; recommendation: { text: string } }; failed: ReviewCondition[] }): string {
  const failed = previous.failed
    .map((c) => `- ${c.id}: ${c.reason}${c.quote ? ` Цитата: «${c.quote}»` : ""}`)
    .join("\n");
  return [
    "",
    "Это пересмотр. Предыдущий текст заключения:",
    previous.draft.text,
    `Предыдущая рекомендация: ${previous.draft.recommendation.text}`,
    "Ревизоры отклонили его по условиям:",
    failed || "- (список пуст)",
    "Исправь именно эти проблемы. Остальное, что было верно, не ухудшай и не выбрасывай.",
  ].join("\n");
}

export function synthUserPrompt(input: {
  scenario: Scenario;
  facts: Fact[];
  opinions: ExpertOpinion[];
  improvements: Improvement[];
  previous?: { draft: { text: string; recommendation: { text: string } }; failed: ReviewCondition[] };
  dataset?: Dataset;
}): string {
  return [
    "Сценарий (5 мер):",
    input.scenario.decisions.map((d) => `- ${decisionLabel(d, false, input.dataset)}`).join("\n"),
    "",
    "Факты (единственный источник чисел):",
    factLines(input.facts),
    "",
    "Мнения экспертов:",
    opinionLines(input.opinions),
    "",
    "Улучшения (рекомендация только отсюда; рекомендуется №1, если есть):",
    improvementLines(input.improvements),
    input.previous ? revisionBlock(input.previous) : "",
  ].join("\n");
}
