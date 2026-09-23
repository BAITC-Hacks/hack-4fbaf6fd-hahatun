import { describe, expect, it } from "vitest";
import { calculate } from "./engine";
import { scoreAtQuarter, timeline, valuesAtQuarter } from "./timeline";
import type { Scenario } from "@/lib/types";

const GOLDEN: Scenario = {
  decisions: [
    { measureId: "M7", districtId: "nura" },
    { measureId: "M8", districtId: "nura" },
    { measureId: "M10", districtId: "nura" },
    { measureId: "M12" },
    { measureId: "M5", districtId: "saryarka" },
  ],
};

describe("timeline", () => {
  it("quarter 8 equals the engine result, quarter 0 equals the baseline", () => {
    const r = calculate(GOLDEN);
    const q8 = valuesAtQuarter(GOLDEN, 8);
    const q0 = valuesAtQuarter(GOLDEN, 0);
    expect(q8.score).toBeCloseTo(r.score, 9);
    expect(q0.score).toBeCloseTo(r.baseScore, 9);
    for (const d of r.districts) {
      expect(q8.districts[d.id].d).toBeCloseTo(d.dAfter, 9);
      expect(q0.districts[d.id].d).toBeCloseTo(d.dBefore, 9);
      expect(q8.districts[d.id].indicators.S1).toBeCloseTo(d.after.S1, 9);
    }
  });

  it("a lag-4 measure (LRT) does nothing until quarter 5", () => {
    const lrt: Scenario = { decisions: [{ measureId: "M3", districtId: "nura" }] };
    for (let q = 0; q <= 4; q += 1) expect(scoreAtQuarter(lrt, q)).toBeCloseTo(scoreAtQuarter(lrt, 0), 9);
    expect(scoreAtQuarter(lrt, 5)).toBeGreaterThan(scoreAtQuarter(lrt, 4));
  });

  it("synergy switches on only when both measures are active", () => {
    const pair: Scenario = { decisions: [{ measureId: "M10", districtId: "nura" }, { measureId: "M12" }] };
    // M10 lag 1, M12 lag 1: both active from quarter 2, bonus B1 +2 in Nura
    const q1 = valuesAtQuarter(pair, 1).districts.nura.indicators.B1;
    const q2 = valuesAtQuarter(pair, 2).districts.nura.indicators.B1;
    expect(q1).toBeCloseTo(55, 9);
    expect(q2).toBeCloseTo(55 + 12 / 8 + 2, 9);
  });

  it("score does not decrease over the horizon for the golden set and clamps quarters", () => {
    const series = timeline(GOLDEN).map((t) => t.score);
    for (let i = 1; i < series.length; i += 1) expect(series[i]).toBeGreaterThanOrEqual(series[i - 1] - 1e-9);
    expect(valuesAtQuarter(GOLDEN, 42).quarter).toBe(8);
    expect(valuesAtQuarter(GOLDEN, -3).quarter).toBe(0);
  });
});
