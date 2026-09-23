import { describe, expect, it } from "vitest";
import type { Run } from "@/lib/types";
import sample from "../../../fixtures/sample-run.json";
import { baseCriticals, firstSentence, nextSteps, verdictSentence } from "./verdict";

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
