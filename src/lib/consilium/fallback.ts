import { INDICATOR_DIRECTION } from "@/lib/data";
import { DEFAULT_DATASET, type Dataset } from "@/lib/dataset";
import { measureIndex } from "@/lib/engine/engine";
import {
  DIRECTION_LABELS,
  DISTRICT_LABELS,
  INDICATOR_LABELS,
  type Decision,
  type Direction,
  type Draft,
  type ExpertOpinion,
  type ExpertRole,
  type Fact,
  type Improvement,
  type Indicator,
  type Scenario,
} from "@/lib/types";
import { EXPERT_NAMES, EXPERT_ROLES } from "./prompts";

// Deterministic opinions and draft built from facts only: used when the LLM is disabled or a call fails.
// Every number in the generated texts is copied verbatim from a fact text.

export interface FallbackInput {
  scenario: Scenario;
  facts: Fact[];
  improvements: Improvement[];
  dataset?: Dataset; // sandbox runs; the case data otherwise
}

const kind = {
  score: (f: Fact) => f.text.startsWith("Итоговый Score"),
  weakest: (f: Fact) => f.text.startsWith("Слабейший район"),
  criticalCount: (f: Fact) => f.text.startsWith("Критических значений"),
  cost: (f: Fact) => f.text.startsWith("Стоимость набора"),
  districtTotal: (f: Fact) => f.text.startsWith("Итог района"),
  stillCritical: (f: Fact) => f.text.startsWith("Остаётся критическим"),
  unchanged: (f: Fact) => f.text.startsWith("Направление «"),
  contribution: (f: Fact) => f.text.startsWith("Вклад "),
  synergy: (f: Fact) => f.text.startsWith("Синергия"),
  improvement: (f: Fact) => f.text.startsWith("Улучшение №"),
};

const isIndicatorChange = (f: Fact) => f.scope !== "general" && /\(([+−])[\d.]+\)$/.test(f.text);

// Signed change parsed from the "(+8.75)" / "(−2)" suffix of a fact.
export function factDelta(f: Fact): number {
  const m = f.text.match(/\(([+−])([\d.]+)\)$/) ?? f.text.match(/: ([+−])([\d.]+)$/);
  if (!m) return 0;
  return (m[1] === "−" ? -1 : 1) * Number(m[2]);
}

// Same selection the LLM expert receives: own scope + general; finance gets general + all contributions.
export function factsForRole(role: ExpertRole, facts: Fact[]): Fact[] {
  if (role === "finance") return facts.filter((f) => f.scope === "general" || kind.contribution(f));
  return facts.filter((f) => f.scope === role || f.scope === "general");
}

const DISTRICT_COUNT = DEFAULT_DATASET.districts.length;

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const sentence = (s: string) => (/[.!?]$/.test(s) ? s : `${s}.`);
const refs = (...fs: (Fact | undefined)[]) => [...new Set(fs.filter((f): f is Fact => !!f).map((f) => f.id))];

// Worst baseline indicator of a direction, named without its value (the value is not a fact).
function worstIndicator(dir: Direction, ds: Dataset): { indicator: Indicator; districtId: Decision["districtId"] } {
  let best = { indicator: "T1" as Indicator, districtId: ds.districts[0].id, value: Infinity };
  for (const d of ds.districts) {
    for (const k of Object.keys(d.indicators) as Indicator[]) {
      if (INDICATOR_DIRECTION[k] === dir && d.indicators[k] < best.value) best = { indicator: k, districtId: d.id, value: d.indicators[k] };
    }
  }
  return best;
}

// Measure of the direction with the strongest effect on the given indicator.
function suggestFor(dir: Direction, indicator: Indicator, districtId: Decision["districtId"], ds: Dataset): Decision | undefined {
  const m = ds.measures.filter((x) => x.direction === dir).sort((a, b) => (b.effects[indicator] ?? 0) - (a.effects[indicator] ?? 0))[0];
  if (!m) return undefined;
  return m.scope === "district" ? { measureId: m.id, districtId } : { measureId: m.id };
}

interface DirectionView {
  label: string;
  unchanged?: Fact;
  critical?: Fact;
  worse?: Fact;
  best?: Fact;
  changes: Fact[];
  contrib: Fact[];
}

function viewOf(role: Direction, facts: Fact[]): DirectionView {
  const own = facts.filter((f) => f.scope === role);
  const byDelta = (a: Fact, b: Fact) => factDelta(b) - factDelta(a);
  const changes = own.filter(isIndicatorChange).sort(byDelta);
  return {
    label: DIRECTION_LABELS[role],
    unchanged: own.find(kind.unchanged),
    critical: own.find(kind.stillCritical),
    worse: changes.filter((f) => factDelta(f) < 0).at(-1),
    best: changes[0] && factDelta(changes[0]) > 0 ? changes[0] : undefined,
    changes,
    contrib: own.filter(kind.contribution).sort(byDelta),
  };
}

const indicatorsOf = (dir: Direction) =>
  (Object.keys(INDICATOR_DIRECTION) as Indicator[]).filter((k) => INDICATOR_DIRECTION[k] === dir).join(" и ");

function directionRisk(role: Direction, v: DirectionView, ds: Dataset): { risk: string; suggestion?: Decision } {
  if (v.critical) return { risk: `${sentence(v.critical.text)} Штраф за критическое значение сохраняется весь горизонт.` };
  if (v.worse) return { risk: `${sentence(v.worse.text)} Показатель проседает из-за мер соседних направлений.` };
  if (v.unchanged || !v.best) {
    const w = worstIndicator(role, ds);
    const where = DISTRICT_LABELS[w.districtId!];
    return {
      risk: `Худший показатель направления — ${w.indicator} (${INDICATOR_LABELS[w.indicator].toLowerCase()}) в районе ${where}, и он остаётся без поддержки весь горизонт.`,
      suggestion: suggestFor(role, w.indicator, w.districtId, ds),
    };
  }
  const gains = v.changes.filter((f) => factDelta(f) > 0).sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
  if (gains.length > 1 && gains[0] !== v.best) {
    return { risk: `${sentence(gains[0].text)} Даже после мер это самое слабое место направления, запас небольшой.` };
  }
  const lag = soleMeasureLag(v, ds);
  if (lag === undefined) return { risk: "Весь эффект направления держится на одной мере: без неё прироста не будет вовсе." };
  return {
    risk: `Весь эффект направления держится на одной мере с лагом ${lag} ${quartersWord(lag)}: до её запуска прироста нет.`,
  };
}

const quartersWord = (n: number) => (n === 1 ? "квартал" : n < 5 ? "квартала" : "кварталов");

// The direction's only contribution fact reads "Вклад M5 «…» в Score: …"; its measure gives the lag.
function soleMeasureLag(v: DirectionView, ds: Dataset): number | undefined {
  const code = v.contrib[0]?.text.match(/\bM(?:1[0-4]|[1-9])\b/)?.[0];
  return code ? measureIndex(ds).get(code)?.lag : undefined;
}

function directionTradeoff(v: DirectionView, imp: Improvement | undefined): string {
  if (v.unchanged || v.critical || v.worse) {
    return imp
      ? `Деньги ушли в другие направления; оптимизатор предлагает ${imp.change}, и это стоит обсудить, прежде чем подписывать набор.`
      : `Деньги ушли в другие направления, и без замены одной из мер «${v.label}» ничего не получит.`;
  }
  const districts = [...new Set(v.changes.map((f) => f.text.split(" ")[0]))];
  if (districts.length >= DISTRICT_COUNT) {
    return "Эффект размазан по всем районам тонким слоем: точечно ни один провал направления не закрыт.";
  }
  return `Эффект сосредоточен в ${districts.length > 1 ? "районах" : "районе"} ${districts.join(", ")}, остальные районы по направлению «${v.label}» не получают ничего.`;
}

function directionOpinion(role: Direction, input: FallbackInput): ExpertOpinion {
  const v = viewOf(role, input.facts);
  const summary = v.best
    ? `${sentence(v.best.text)} ${v.contrib[0] ? sentence(v.contrib[0].text) : "Прямых мер направления в наборе нет, это побочный эффект."}`
    : `Мер направления «${v.label}» в наборе нет: ${indicatorsOf(role)} не сдвинулись ни в одном районе.`;
  const { risk, suggestion } = directionRisk(role, v, input.dataset ?? DEFAULT_DATASET);
  const concern = Boolean(v.unchanged || v.critical || v.worse);
  return {
    role,
    name: EXPERT_NAMES[role],
    stance: concern ? "concern" : "support",
    summary,
    risk,
    tradeoff: directionTradeoff(v, input.improvements[0]),
    factRefs: refs(v.best, v.contrib[0], v.unchanged, v.critical, v.worse),
    ...(suggestion ? { suggestion } : {}),
  };
}

function financeOpinion(input: FallbackInput): ExpertOpinion {
  const own = factsForRole("finance", input.facts);
  const byId = measureIndex(input.dataset ?? DEFAULT_DATASET);
  const cost = own.find(kind.cost);
  // Ranked by contribution per unit of cost (the ratio itself is not quoted, only the facts).
  const perCost = (f: Fact) => factDelta(f) / (byId.get(f.text.match(/^Вклад (M\d+)/)?.[1] ?? "")?.cost ?? 1);
  const contrib = own.filter(kind.contribution).sort((a, b) => perCost(b) - perCost(a));
  const top = contrib[0];
  const low = contrib.at(-1);
  const remaining = cost?.value ?? 0;
  const wasted = contrib.some((f) => factDelta(f) <= 0);
  const concern = wasted || remaining >= 10;
  const imp = input.improvements[0];
  const impFact = own.find((f) => kind.improvement(f) && imp && f.text.includes(imp.change));

  const summary = `${sentence(cost?.text ?? "Стоимость набора не посчитана")} ${top ? `Лучшая отдача на единицу стоимости: ${lowerFirst(sentence(top.text))}` : ""}`.trim();
  const risk = low && low !== top
    ? `${sentence(low.text)} ${factDelta(low) <= 0 ? "Мера не окупается в Score вообще." : "На единицу стоимости это самая слабая отдача в наборе."}`
    : "Вклады мер не посчитаны, оценить отдачу нельзя.";
  const tradeoff = imp
    ? `${impFact ? sentence(impFact.text) : `Оптимизатор предлагает ${imp.change}.`} Это выше по Score, но перекраивает бюджет, и часть уже обещанных районам мер придётся снять.`
    : remaining >= 10
      ? "Остаток бюджета не использован, но лучшего набора оптимизатор не нашёл."
      : "Бюджет использован почти полностью, лучшего набора при этих правилах нет.";

  return {
    role: "finance",
    name: EXPERT_NAMES.finance,
    stance: concern ? "concern" : "support",
    summary,
    risk,
    tradeoff,
    factRefs: refs(cost, top, low, impFact),
  };
}

export function fallbackOpinion(role: ExpertRole, input: FallbackInput): ExpertOpinion {
  return role === "finance" ? financeOpinion(input) : directionOpinion(role, input);
}

export function fallbackOpinions(input: FallbackInput): ExpertOpinion[] {
  return EXPERT_ROLES.map((role) => fallbackOpinion(role, input));
}

// "Вклад M7 «...» в Score: +1.45" -> "M7 «...» +1.45"
const contributionPhrase = (f: Fact) => f.text.replace(/^Вклад /, "").replace(" в Score:", "");

function draftLists(facts: Fact[]) {
  const gains = facts.filter((f) => isIndicatorChange(f) && factDelta(f) > 0).sort((a, b) => factDelta(b) - factDelta(a));
  const synergy = facts.find(kind.synergy);
  const strengths = [...gains.slice(0, synergy ? 2 : 3).map((f) => f.text), ...(synergy ? [synergy.text] : [])];

  const riskFacts = [
    ...facts.filter(kind.stillCritical),
    ...facts.filter((f) => isIndicatorChange(f) && factDelta(f) < 0),
    ...facts.filter(kind.unchanged),
  ];
  const low = [...facts.filter(kind.contribution)].sort((a, b) => factDelta(a) - factDelta(b))[0];
  const risks = riskFacts.slice(0, 2).map((f) => f.text);
  if (low) risks.push(`Слабейшая отдача: ${lowerFirst(low.text)}`);

  const totals = facts.filter(kind.districtTotal).sort((a, b) => factDelta(b) - factDelta(a));
  const consequences = totals.slice(0, 3).map((f) => f.text);
  const weakest = facts.find(kind.weakest);
  if (consequences.length < 2 && weakest) consequences.push(weakest.text);
  return { strengths, risks: risks.slice(0, 3), consequences };
}

function recommendationFor(input: FallbackInput): Draft["recommendation"] {
  const imp = input.improvements[0];
  if (!imp) return { text: "Лучшего набора при этих правилах оптимизатор не нашёл, рекомендуем оставить набор без изменений." };
  const fact = input.facts.find((f) => kind.improvement(f) && f.text.includes(imp.change));
  return { improvement: imp, text: fact ? `Рекомендуем: ${lowerFirst(sentence(fact.text))}` : `Рекомендуем замену: ${imp.change}.` };
}

function draftText(input: FallbackInput, recommendation: Draft["recommendation"]): string {
  const f = input.facts;
  const score = f.find(kind.score);
  const weakest = f.find(kind.weakest);
  const crit = f.find(kind.criticalCount);
  const cost = f.find(kind.cost);
  const contrib = f.filter(kind.contribution);
  const risk = f.find(kind.stillCritical) ?? f.find(kind.unchanged) ?? f.find((x) => isIndicatorChange(x) && factDelta(x) < 0);

  const parts: string[] = [];
  if (score) parts.push(`Набор даёт ${lowerFirst(sentence(score.text))}`);
  if (weakest) {
    const name = weakest.text.replace(/^Слабейший район /, "").replace(/:.*/, "");
    const range = weakest.text.replace(/^[^:]*: /, "");
    parts.push(
      `Слабейший район — ${name} (${range}): он ниже остальных по итоговому индексу, поэтому его рост сильнее всего двигает Score через слагаемое слабейшего района.`,
    );
  }
  if (contrib.length) parts.push(`Эффект мер по вкладу в Score: ${contrib.map(contributionPhrase).join("; ")}.`);
  if (crit) parts.push(sentence(crit.text));
  if (risk) parts.push(`Риск: ${lowerFirst(risk.text)}, и без отдельной меры это не исправится.`);
  if (cost) parts.push(`Компромисс: ${lowerFirst(cost.text)}, поэтому усилить другое направление можно только заменой одной из мер.`);
  if (parts.length < 6) parts.push(recommendation.text);
  return parts.slice(0, 6).join(" ");
}

export function fallbackDraft(input: FallbackInput, version = 1): Draft {
  const recommendation = recommendationFor(input);
  return { version, ...draftLists(input.facts), recommendation, text: draftText(input, recommendation) };
}
