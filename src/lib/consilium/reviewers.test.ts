import { beforeAll, describe, expect, it, vi } from "vitest";
import { buildFacts, calculate } from "@/lib/engine";
import type { Draft, Improvement, Scenario } from "@/lib/types";
import { LlmUsage } from "./llm";
import { checkNumbers, checkRecommendation, review, scenarioMeasures, weakestDistrict } from "./reviewers";

vi.mock("server-only", () => ({}));

const GOLDEN: Scenario = {
  decisions: [
    { measureId: "M7", districtId: "nura" },
    { measureId: "M8", districtId: "nura" },
    { measureId: "M10", districtId: "nura" },
    { measureId: "M12" },
    { measureId: "M5", districtId: "saryarka" },
  ],
};
const engine = calculate(GOLDEN);
const facts = buildFacts(GOLDEN, engine);
const factsWithImprovement = [...facts, { id: "F99", text: "Улучшение №1: M5 Сарыарка → M3 Нура, Score 57.21 (+0.66)", value: 57.21, scope: "general" as const }];

const BETTER: Improvement = {
  scenario: { decisions: [...GOLDEN.decisions.slice(0, 4), { measureId: "M3", districtId: "nura" }] },
  score: 57.21,
  delta: 0.66,
  change: "M5 Сарыарка → M3 ЛРТ Нура",
};

const GOOD_TEXT =
  "Нура остаётся слабейшим районом (52.96), потому что поликлиники поднимаются только с 35 до 43,75. " +
  "M7 поднимает школы Нуры с 38 до 48, M8 — поликлиники, M10 даёт безопасность улиц 67.5, " +
  "M12 ускоряет обращения на 4.38 во всех районах, M5 улучшает воздух Сарыарки с 40 до 48.75. " +
  "Итоговый Score 56.54 против 52.56. Риск: M7 и M8 начинают работать с лагом. " +
  "Компромисс: транспорт не получил ничего ради закрытия критических провалов.";

function draft(text: string, improvement?: Improvement): Draft {
  return {
    version: 1,
    strengths: ["Оба критических провала Нуры закрыты"],
    risks: ["S2 Нуры 43.75 близко к порогу 40"],
    consequences: ["Остаток бюджета 5"],
    recommendation: { text: improvement ? "Заменить M5 на M3 в Нуре: Score 57.21" : "Оставить набор", improvement },
    text,
  };
}

beforeAll(() => {
  process.env.OPENAI_API_KEY = "";
});

describe("C1 numbers", () => {
  it("passes when every number is from the facts", () => {
    const c = checkNumbers({ draft: draft(GOOD_TEXT), facts });
    expect(c.passed).toBe(true);
    expect(c.by).toBe("code");
  });

  it("fails on a number absent from the facts and quotes its sentence", () => {
    const c = checkNumbers({ draft: draft(`${GOOD_TEXT} Туризм вырастет на 99.9 пункта.`), facts });
    expect(c.passed).toBe(false);
    expect(c.reason).toContain("99.9");
    expect(c.quote).toBe("Туризм вырастет на 99.9 пункта.");
  });
});

describe("C2 recommendation", () => {
  it("passes a valid improvement better than the user's score", () => {
    const c = checkRecommendation({ draft: draft(GOOD_TEXT, BETTER), facts: factsWithImprovement, userScore: engine.score });
    expect(c.passed).toBe(true);
  });

  it("fails an invalid improvement", () => {
    const invalid: Improvement = { ...BETTER, scenario: { decisions: BETTER.scenario.decisions.slice(0, 4) } };
    const c = checkRecommendation({ draft: draft(GOOD_TEXT, invalid), facts: factsWithImprovement, userScore: engine.score });
    expect(c.passed).toBe(false);
    expect(c.reason).toMatch(/невалиден/);
  });

  it("fails an improvement that is not better", () => {
    const c = checkRecommendation({ draft: draft(GOOD_TEXT, BETTER), facts: factsWithImprovement, userScore: 60 });
    expect(c.passed).toBe(false);
  });

  it("requires a recommendation only when the optimizer found improvements", () => {
    expect(checkRecommendation({ draft: draft(GOOD_TEXT), facts, userScore: engine.score }).passed).toBe(true);
    expect(checkRecommendation({ draft: draft(GOOD_TEXT), facts: factsWithImprovement, userScore: engine.score }).passed).toBe(false);
  });
});

describe("review without LLM", () => {
  it("extracts weakest district and scenario measures from facts", () => {
    expect(weakestDistrict(facts)).toBe("Нура");
    expect(scenarioMeasures(facts).map((m) => m.id)).toEqual(["M7", "M8", "M10", "M12", "M5"]);
  });

  it("passes a complete draft 6/6 with heuristics", async () => {
    const usage = new LlmUsage();
    const r = await review({ draft: draft(GOOD_TEXT, BETTER), facts: factsWithImprovement, userScore: engine.score, round: 2 }, usage);
    expect(r.conditions.map((c) => c.id)).toEqual(["C1", "C2", "C3", "C4", "C5", "C6"]);
    expect(r.passed).toBe(6);
    expect(r.total).toBe(6);
    expect(r.round).toBe(2);
    expect(r.ok).toBe(true);
    expect(r.conditions.find((c) => c.id === "C3")!.reason).toMatch(/эвристика/);
    expect(usage.traces).toHaveLength(0);
  });

  it("fails a draft without cause, measures and tradeoff", async () => {
    const r = await review({ draft: draft("Нура выросла. Риск есть. Туризм 99.9."), facts, userScore: engine.score, round: 1 }, new LlmUsage());
    const failed = r.conditions.filter((c) => !c.passed).map((c) => c.id);
    expect(failed).toEqual(["C1", "C3", "C4", "C5"]);
    expect(r.ok).toBe(false);
  });
});
