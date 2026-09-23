import { describe, expect, it } from "vitest";
import type { Run } from "@/lib/types";
import live from "../../../fixtures/live-run.json";
import sample from "../../../fixtures/sample-run.json";
import { baseCriticals, firstSentence, nextSteps, optimumGap, verdictSentence } from "./verdict";

const run = sample as Run;

describe("verdict helpers", () => {
  it("builds the verdict sentence for the golden set", () => {
    expect(baseCriticals(run.engine.districts)).toBe(2);
    expect(verdictSentence(run.engine, "approve")).toBe(
      "Консилиум утвердил набор: Score вырос, критических значений не осталось (было 2), " +
        "слабейший район Нура поднялся с 49.18 до 52.96.",
    );
  });

  it("covers flat weakest district and remaining criticals", () => {
    const flat = run.engine.districts.map((d) => ({ ...d, after: d.before, dAfter: d.dBefore }));
    const engine = { ...run.engine, delta: -1, nCrit: 2, districts: flat };
    expect(verdictSentence(engine, "return")).toBe(
      "Консилиум вернул набор на доработку: Score снизился, критических значений по-прежнему 2, " +
        "слабейший район Нура не изменился (49.18).",
    );
  });

  it("cuts the first sentence", () => {
    expect(firstSentence("Набор сильный. Но есть риск!")).toBe("Набор сильный.");
    expect(firstSentence("Одно предложение без точки")).toBe("Одно предложение без точки");
  });

  it("prefers mandates, falls back to optimizer improvements", () => {
    expect(nextSteps(run)[0].href).toBe(`/play?from=${run.id}&mandate=0`);
    const none = { ...run, resolution: { ...run.resolution, mandates: [] } };
    const steps = nextSteps(none);
    expect(steps).toHaveLength(Math.min(3, run.optimizer.improvements.length));
    expect(steps[0].href).toMatch(/^\/play\?s=M/);
  });
});

describe("optimumGap", () => {
  const liveRun = live as Run;
  // The global optimum from optimizer.test.ts (NO_IMPROVEMENT), ~57.24.
  const optimum = {
    decisions: [
      { measureId: "M2" },
      { measureId: "M3", districtId: "nura" },
      { measureId: "M8", districtId: "nura" },
      { measureId: "M9", districtId: "nura" },
      { measureId: "M14" },
    ],
  } as Run["scenario"];
  const withBest = (scenario: Run["scenario"], bestScore: number) => ({
    ...liveRun,
    optimizer: { ...liveRun.optimizer, bestScenario: scenario, bestScore },
  });

  it("lists the swaps from the golden set to the optimum", () => {
    const g = optimumGap(withBest(optimum, 57.24));
    expect(g.isOptimal).toBe(false);
    expect(g.gap).toBeCloseTo(0.7, 2);
    // Only M8 Нура is shared, so four measures differ.
    expect(g.swaps).toEqual([
      "школа и детсад в Нуре → умные светофоры",
      "освещение и камеры в Нуре → линия ЛРТ в Нуре",
      "цифровая платформа обращений → спорт-хабы в Нуре",
      "чистое топливо в Сарыарке → аварийные бригады ЖКХ",
    ]);
    expect(g.href).toBe("/play?s=M2,M3.nura,M8.nura,M9.nura,M14");
  });

  it("reports the optimal set without swaps", () => {
    const g = optimumGap(withBest(liveRun.scenario, liveRun.engine.score));
    expect(g.isOptimal).toBe(true);
    expect(g.swaps).toEqual([]);
  });

  it("names a district move of the same measure", () => {
    const mine = { decisions: [{ measureId: "M7", districtId: "esil" }, { measureId: "M12" }] } as Run["scenario"];
    const best = { decisions: [{ measureId: "M12" }, { measureId: "M7", districtId: "nura" }] } as Run["scenario"];
    const g = optimumGap({ ...withBest(best, liveRun.engine.score + 1), scenario: mine });
    expect(g.swaps).toEqual(["школа и детсад: Есиль → Нура"]);
  });
});
