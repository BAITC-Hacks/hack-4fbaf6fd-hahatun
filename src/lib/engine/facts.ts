import { DISTRICTS, INDICATOR_DIRECTION, MEASURE_BY_ID } from "@/lib/data";
import {
  BUDGET,
  DIRECTION_LABELS,
  DISTRICT_LABELS,
  INDICATOR_LABELS,
  type Direction,
  type EngineResult,
  type Fact,
  type OptimizerResult,
  type Scenario,
} from "@/lib/types";

const r2 = (x: number) => Math.round(x * 100) / 100;

// Numbered facts are the only numbers the LLM layer is allowed to quote (reviewer C1 checks this).
export function buildFacts(scenario: Scenario, engine: EngineResult, optimizer?: OptimizerResult): Fact[] {
  const facts: Fact[] = [];
  const add = (text: string, scope: Fact["scope"], value?: number) => {
    facts.push({ id: `F${facts.length + 1}`, text, scope, ...(value !== undefined ? { value: r2(value) } : {}) });
  };
  const sign = (x: number) => (x >= 0 ? "+" : "−") + Math.abs(r2(x));
  const cost = scenario.decisions.reduce((s, d) => s + (MEASURE_BY_ID[d.measureId]?.cost ?? 0), 0);

  add(`Итоговый Score ${r2(engine.score)}, база ${r2(engine.baseScore)}, дельта ${sign(engine.delta)}`, "general", engine.score);
  const weakest = engine.districts.find((d) => d.id === engine.minDistrict.id)!;
  add(
    `Слабейший район ${DISTRICT_LABELS[weakest.id]}: ${r2(weakest.dBefore)} → ${r2(weakest.dAfter)}`,
    "general",
    weakest.dAfter,
  );
  const baseCrit = engine.districts.flatMap((d) =>
    (Object.keys(d.before) as (keyof typeof d.before)[]).filter((k) => d.before[k] < 40).map((k) => `${DISTRICT_LABELS[d.id]} ${k} ${d.before[k]}`),
  );
  add(
    `Критических значений (ниже 40) после мер: ${engine.nCrit}, было ${baseCrit.length}${baseCrit.length ? ` (${baseCrit.join(", ")})` : ""}`,
    "general",
    engine.nCrit,
  );
  for (const c of engine.criticals) {
    add(`Остаётся критическим: ${DISTRICT_LABELS[c.districtId]} ${c.indicator} ${r2(c.value)}`, INDICATOR_DIRECTION[c.indicator], c.value);
  }
  add(`Стоимость набора ${cost}, остаток бюджета ${BUDGET - cost}`, "general", BUDGET - cost);

  for (const d of engine.districts) {
    if (Math.abs(d.dAfter - d.dBefore) >= 0.05) {
      add(`Итог района ${DISTRICT_LABELS[d.id]}: ${r2(d.dBefore)} → ${r2(d.dAfter)} (${sign(d.dAfter - d.dBefore)})`, "general", d.dAfter);
    }
  }

  const touched = new Set<Direction>();
  for (const d of engine.districts) {
    for (const k of Object.keys(d.after) as (keyof typeof d.after)[]) {
      const diff = d.after[k] - d.before[k];
      if (Math.abs(diff) >= 1) {
        touched.add(INDICATOR_DIRECTION[k]);
        add(
          `${DISTRICT_LABELS[d.id]} ${k} ${INDICATOR_LABELS[k].toLowerCase()}: ${r2(d.before[k])} → ${r2(d.after[k])} (${sign(diff)})`,
          INDICATOR_DIRECTION[k],
          d.after[k],
        );
      }
    }
  }
  for (const dir of Object.keys(DIRECTION_LABELS) as Direction[]) {
    if (!touched.has(dir)) add(`Направление «${DIRECTION_LABELS[dir]}» не изменилось ни в одном районе`, dir);
  }

  for (const c of engine.contributions) {
    const m = MEASURE_BY_ID[c.measureId];
    add(`Вклад ${c.measureId} «${m.title}» в Score: ${sign(c.delta)}`, m.direction, c.delta);
  }
  for (const s of engine.synergies) add(`Синергия сработала: ${s}`, "general");

  if (optimizer) {
    add(`Перцентиль набора среди соседних наборов (одна замена): ${r2(optimizer.percentile * 100)}%`, "general", r2(optimizer.percentile * 100));
    add(`Лучший Score среди соседних наборов (одна замена): ${r2(optimizer.bestScore)}`, "general", optimizer.bestScore);
    optimizer.improvements.forEach((imp, i) => {
      add(`Улучшение №${i + 1}: ${imp.change}, Score ${r2(imp.score)} (${sign(imp.delta)})`, "general", imp.score);
    });
  }
  return facts;
}

export const DISTRICT_COUNT = DISTRICTS.length;
