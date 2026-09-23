import { DISTRICTS, MEASURES, MEASURE_BY_ID } from "@/lib/data";
import { calculate, scoreOf } from "./engine";
import { validate } from "./validator";
import {
  DISTRICT_LABELS,
  type CityEvent,
  type CityShock,
  type Decision,
  type DistrictId,
  type Improvement,
  type Indicator,
  type Run,
} from "@/lib/types";

// "min": the district with the lowest post-measure value of the indicator.
// "populousOfTwoWorst": among the two lowest, the one with the larger population share.
export type EventTarget = "min" | "populousOfTwoWorst";

export interface EventTemplate {
  id: string;
  title: string;
  text: string;
  indicator: Indicator;
  delta: number;
  target: EventTarget;
}

export const EVENT_CATALOGUE: readonly EventTemplate[] = [
  {
    id: "heating-failure",
    title: "Авария на теплосетях",
    text:
      "В разгар морозов прорвало магистральную трубу теплосети, часть домов осталась без отопления и горячей воды. " +
      "Удар пришёлся на район с самыми изношенными сетями, и надёжность ЖКХ там просела сильнее всего.",
    indicator: "C1",
    delta: -15,
    target: "min",
  },
  {
    id: "winter-smog",
    title: "Зимний смог",
    text:
      "Безветренная погода и температурная инверсия заперли над городом выбросы котельных и транспорта. " +
      "Хуже всего стало там, где воздух и так был самым грязным.",
    indicator: "E2",
    delta: -12,
    target: "min",
  },
  {
    id: "second-shift",
    title: "Наплыв учеников: вторая смена",
    text:
      "Новые жилые комплексы заселились быстрее, чем открылись школы, и часть классов перевели во вторую смену. " +
      "Сильнее всего это ударило по району, где мест в школах и детсадах и без того не хватало.",
    indicator: "S1",
    delta: -10,
    target: "min",
  },
  {
    id: "road-accidents",
    title: "Серия ДТП на магистрали",
    text:
      "За месяц на одной магистрали произошла серия тяжёлых аварий с пострадавшими. " +
      "Показатель безопасности дорожного движения упал в районе, где он и так был самым низким.",
    indicator: "B2",
    delta: -10,
    target: "min",
  },
  {
    id: "bridge-flood",
    title: "Паводок перекрыл мост",
    text:
      "Весенний паводок закрыл мост, и поток машин ушёл на объездные улицы. " +
      "Пробки выросли в самом населённом из двух районов с худшей разгрузкой дорог.",
    indicator: "T1",
    delta: -10,
    target: "populousOfTwoWorst",
  },
  {
    id: "flu-season",
    title: "Перегрузка поликлиник в сезон гриппа",
    text:
      "Эпидемия гриппа удвоила очереди к терапевтам, записи на приём растянулись на недели. " +
      "Больше всего пострадал район, где первичной медпомощи и так не хватало.",
    indicator: "S2",
    delta: -8,
    target: "min",
  },
];

// Deterministic 31-based string hash, unsigned, modulo the catalogue size.
export function pickEventIndex(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % EVENT_CATALOGUE.length;
}

type AfterValues = Record<DistrictId, Record<Indicator, number>>;

// Ties go to the district listed first in DISTRICTS (stable sort).
export function pickDistrict(tpl: EventTemplate, after: AfterValues): DistrictId {
  const sorted = [...DISTRICTS].sort((a, b) => after[a.id][tpl.indicator] - after[b.id][tpl.indicator]);
  if (tpl.target === "min") return sorted[0].id;
  const [first, second] = sorted;
  return second.population > first.population ? second.id : first.id;
}

function buildCandidates(): Decision[] {
  const list: Decision[] = [];
  for (const m of MEASURES) {
    if (m.scope === "city") list.push({ measureId: m.id });
    else for (const d of DISTRICTS) list.push({ measureId: m.id, districtId: d.id });
  }
  return list;
}

const CANDIDATES = buildCandidates();

function label(d: Decision, withTitle: boolean): string {
  const m = MEASURE_BY_ID[d.measureId];
  const where = d.districtId ? DISTRICT_LABELS[d.districtId] : "город";
  return withTitle ? `${m.id} ${m.title}, ${where}` : `${m.id} ${where}`;
}

// Best single-decision swap under the shock that strictly beats the shocked score.
export function bestSwap(decisions: Decision[], shock: CityShock, baseline: number): Improvement | undefined {
  let best: { decisions: Decision[]; score: number; change: string } | undefined;
  for (let i = 0; i < decisions.length; i++) {
    for (const cand of CANDIDATES) {
      const next = decisions.map((d, j) => (j === i ? cand : d));
      if (!validate({ decisions: next }).ok) continue;
      const score = scoreOf(next, [shock]);
      if (score <= baseline + 1e-9 || (best && score <= best.score)) continue;
      best = { decisions: next, score, change: `${label(decisions[i], false)} → ${label(cand, true)}` };
    }
  }
  if (!best) return undefined;
  return { scenario: { decisions: best.decisions }, score: best.score, delta: best.score - baseline, change: best.change };
}

export function buildEvent(run: Run): CityEvent {
  const tpl = EVENT_CATALOGUE[pickEventIndex(run.id)];
  const after = Object.fromEntries(run.engine.districts.map((d) => [d.id, d.after])) as AfterValues;
  const shock: CityShock = { districtId: pickDistrict(tpl, after), indicator: tpl.indicator, delta: tpl.delta };
  const decisions = run.scenario.decisions;
  const scoreAfter = scoreOf(decisions, [shock]);
  const suggestion = bestSwap(decisions, shock, scoreAfter);
  return {
    id: tpl.id,
    title: tpl.title,
    text: tpl.text,
    shock,
    scoreBefore: run.engine.score,
    scoreAfter,
    nCritAfter: calculate(run.scenario, [shock]).nCrit,
    ...(suggestion ? { suggestion } : {}),
  };
}
