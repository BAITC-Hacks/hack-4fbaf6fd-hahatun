import { describe, expect, it } from "vitest";
import { calculate } from "@/lib/engine/engine";
import type { Scenario } from "@/lib/types";
import { quarterLabel, quarterView } from "./timeline";

const GOLDEN: Scenario = {
  decisions: [
    { measureId: "M7", districtId: "nura" },
    { measureId: "M8", districtId: "nura" },
    { measureId: "M10", districtId: "nura" },
    { measureId: "M12" },
    { measureId: "M5", districtId: "saryarka" },
  ],
};

describe("quarterView", () => {
  const r = calculate(GOLDEN);

  it("returns the engine districts untouched at quarter 8", () => {
    const v = quarterView(r.districts, GOLDEN, 8);
    expect(v.districts).toBe(r.districts);
    expect(v.score).toBeCloseTo(r.score, 9);
    expect(v.nCrit).toBe(r.nCrit);
  });

  it("at quarter 0 'after' equals the baseline and 'before' is kept", () => {
    const v = quarterView(r.districts, GOLDEN, 0);
    expect(v.score).toBeCloseTo(r.baseScore, 9);
    for (const d of v.districts) {
      const src = r.districts.find((x) => x.id === d.id)!;
      expect(d.before).toBe(src.before);
      expect(d.dAfter).toBeCloseTo(src.dBefore, 9);
      expect(d.after.S1).toBeCloseTo(src.before.S1, 9);
    }
  });
});

describe("quarterLabel", () => {
  it("names start, year 1 and year 2", () => {
    expect(quarterLabel(0)).toBe("Старт");
    expect(quarterLabel(4)).toBe("Квартал 4 · год 1");
    expect(quarterLabel(5)).toBe("Квартал 5 · год 2");
  });
});
