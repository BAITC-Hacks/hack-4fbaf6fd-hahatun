import { describe, expect, it } from "vitest";
import { DISTRICTS, MEASURES, WEIGHTS, SYNERGIES, CONFLICTS, MEASURE_BY_ID } from "./index";

describe("dataset constants", () => {
  it("has 5 districts whose population shares sum to 1", () => {
    expect(DISTRICTS).toHaveLength(5);
    expect(DISTRICTS.reduce((s, d) => s + d.population, 0)).toBeCloseTo(1, 9);
  });
  it("has indicator weights that sum to 1", () => {
    expect(Object.values(WEIGHTS).reduce((s, w) => s + w, 0)).toBeCloseTo(1, 9);
  });
  it("has 14 measures with 2-3 per direction", () => {
    expect(MEASURES).toHaveLength(14);
    const perDirection = new Map<string, number>();
    for (const m of MEASURES) perDirection.set(m.direction, (perDirection.get(m.direction) ?? 0) + 1);
    expect([...perDirection.values()].every((n) => n >= 2 && n <= 3)).toBe(true);
  });
  it("synergies start with a district-scoped measure", () => {
    for (const s of SYNERGIES) expect(MEASURE_BY_ID[s.pair[0]].scope).toBe("district");
    expect(CONFLICTS).toHaveLength(3);
  });
});
