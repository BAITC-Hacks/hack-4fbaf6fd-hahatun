import { describe, expect, it } from "vitest";
import { optimize } from "./optimizer";
import { validate } from "./validator";
import type { Scenario } from "@/lib/types";

// Same golden example as engine.test.ts (docs/source/dataset.md §3): cost 95, Score ≈ 56.54.
const GOLDEN: Scenario = {
  decisions: [
    { measureId: "M7", districtId: "nura" },
    { measureId: "M8", districtId: "nura" },
    { measureId: "M10", districtId: "nura" },
    { measureId: "M12" },
    { measureId: "M5", districtId: "saryarka" },
  ],
};

// Found by random search: none of its 270 single-swap neighbours beat its own score (~57.24).
const NO_IMPROVEMENT: Scenario = {
  decisions: [
    { measureId: "M8", districtId: "nura" },
    { measureId: "M3", districtId: "nura" },
    { measureId: "M9", districtId: "nura" },
    { measureId: "M2" },
    { measureId: "M14" },
  ],
};

describe("optimize", () => {
  it("finds the best single-swap improvement for the golden example", () => {
    const r = optimize(GOLDEN);

    expect(r.improvements.length).toBeGreaterThan(0);
    expect(r.improvements.length).toBeLessThanOrEqual(3);

    const best = r.improvements[0];
    expect(best.score).toBeCloseTo(57.21, 2);
    expect(best.change).toBe("M5 Сарыарка → M3 Линия ЛРТ / расширение, Нура");
    expect(best.delta).toBeCloseTo(best.score - 56.54, 2);

    for (const imp of r.improvements) {
      expect(validate(imp.scenario).ok).toBe(true);
      expect(imp.score).toBeGreaterThan(56.54);
      expect(imp.delta).toBeCloseTo(imp.score - 56.54, 2);
    }

    expect(r.percentile).toBeGreaterThanOrEqual(0);
    expect(r.percentile).toBeLessThanOrEqual(1);
    expect(r.bestScore).toBeGreaterThanOrEqual(56.54);
    expect(r.bestScore).toBeCloseTo(r.improvements[0].score, 6);
  });

  it("returns no improvements and the original scenario when it is already a local optimum", () => {
    expect(validate(NO_IMPROVEMENT).ok).toBe(true);

    const r = optimize(NO_IMPROVEMENT);

    expect(r.improvements).toEqual([]);
    expect(r.bestScenario).toEqual(NO_IMPROVEMENT);
    expect(r.percentile).toBeGreaterThanOrEqual(0);
    expect(r.percentile).toBeLessThanOrEqual(1);
  });

  it("never throws on an invalid scenario and still returns a well-formed result", () => {
    const invalid: Scenario = { decisions: [{ measureId: "M1", districtId: "esil" }] }; // COUNT violation
    expect(() => optimize(invalid)).not.toThrow();

    const r = optimize(invalid);
    expect(r.percentile).toBeGreaterThanOrEqual(0);
    expect(r.percentile).toBeLessThanOrEqual(1);
    expect(r.improvements.length).toBeLessThanOrEqual(3);
    for (const imp of r.improvements) {
      expect(validate(imp.scenario).ok).toBe(true);
    }
  });
});
