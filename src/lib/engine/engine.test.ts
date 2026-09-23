import { describe, expect, it } from "vitest";
import { calculate, scoreOf } from "./engine";
import { buildFacts } from "./facts";
import { validate } from "./validator";
import type { Scenario } from "@/lib/types";

// Golden example from docs/source/dataset.md §3: cost 95, Score ≈ 56.5, synergy M10+M12 active.
export const GOLDEN: Scenario = {
  decisions: [
    { measureId: "M7", districtId: "nura" },
    { measureId: "M8", districtId: "nura" },
    { measureId: "M10", districtId: "nura" },
    { measureId: "M12" },
    { measureId: "M5", districtId: "saryarka" },
  ],
};

export const CHEAPEST: Scenario = {
  decisions: [
    { measureId: "M9", districtId: "nura" },
    { measureId: "M11", districtId: "esil" },
    { measureId: "M10", districtId: "nura" },
    { measureId: "M12" },
    { measureId: "M4", districtId: "saryarka" },
  ],
};

describe("engine", () => {
  it("reproduces the baseline score 52.56 with two critical values in Nura", () => {
    const r = calculate({ decisions: [] });
    expect(r.baseScore).toBeCloseTo(52.56, 2);
    expect(r.score).toBeCloseTo(52.56, 2);
    expect(r.nCrit).toBe(2);
    expect(r.criticals.map((c) => `${c.districtId}:${c.indicator}`)).toEqual(["nura:S1", "nura:S2"]);
  });

  it("reproduces the golden example 56.54 with the M10+M12 synergy", () => {
    const r = calculate(GOLDEN);
    expect(r.score).toBeCloseTo(56.54, 2);
    expect(r.nCrit).toBe(0);
    expect(r.synergies).toHaveLength(1);
    const nura = r.districts.find((d) => d.id === "nura")!;
    // B1: 55 + 12 * 7/8 + 2 (synergy) = 67.5
    expect(nura.after.B1).toBeCloseTo(67.5, 6);
    expect(nura.after.S1).toBeCloseTo(48, 6);
    expect(r.minDistrict.id).toBe("nura");
  });

  it("clips indicators to 0..100 and ignores lag for synergies", () => {
    const r = calculate({ decisions: [{ measureId: "M10", districtId: "esil" }, { measureId: "M12" }] });
    const esil = r.districts.find((d) => d.id === "esil")!;
    expect(esil.after.B1).toBeCloseTo(78 + 12 * 7 / 8 + 2, 6);
    expect(esil.after.B1).toBeLessThanOrEqual(100);
  });

  it("contributions equal score(all) - score(all minus m)", () => {
    const r = calculate(GOLDEN);
    const without = GOLDEN.decisions.filter((d) => d.measureId !== "M7");
    expect(r.contributions.find((c) => c.measureId === "M7")!.delta).toBeCloseTo(r.score - scoreOf(without), 9);
  });

  it("changing the set changes the score (jury criterion 5)", () => {
    expect(scoreOf(GOLDEN.decisions)).not.toBeCloseTo(scoreOf(CHEAPEST.decisions), 2);
  });
});

describe("facts", () => {
  it("numbers every fact, scopes it and includes the score", () => {
    const r = calculate(GOLDEN);
    const facts = buildFacts(GOLDEN, r);
    expect(facts[0].id).toBe("F1");
    expect(facts[0].value).toBeCloseTo(56.54, 2);
    expect(facts.every((f, i) => f.id === `F${i + 1}`)).toBe(true);
    expect(facts.some((f) => f.scope === "social" && f.text.includes("Нура S1"))).toBe(true);
    expect(facts.some((f) => f.scope === "transport" && f.text.includes("не изменилось"))).toBe(true);
  });
});

describe("validator", () => {
  const ok = (s: Scenario) => validate(s);
  it("accepts the golden example and the cheapest set", () => {
    expect(ok(GOLDEN)).toMatchObject({ ok: true, cost: 95, remaining: 5 });
    expect(ok(CHEAPEST)).toMatchObject({ ok: true, cost: 61 });
  });
  it("COUNT: exactly five decisions", () => {
    expect(ok({ decisions: GOLDEN.decisions.slice(0, 4) }).errors.map((e) => e.code)).toContain("COUNT");
  });
  it("BUDGET: rejects sets over 100", () => {
    const s: Scenario = { decisions: [
      { measureId: "M3", districtId: "esil" }, { measureId: "M13", districtId: "almaty" }, { measureId: "M5", districtId: "saryarka" },
      { measureId: "M7", districtId: "nura" }, { measureId: "M2" },
    ] };
    const v = ok(s);
    expect(v.cost).toBe(129);
    expect(v.errors.map((e) => e.code)).toContain("BUDGET");
  });
  it("DUPLICATE: same measure twice", () => {
    const s: Scenario = { decisions: [...GOLDEN.decisions.slice(0, 4), { measureId: "M7", districtId: "esil" }] };
    expect(ok(s).errors.map((e) => e.code)).toContain("DUPLICATE");
  });
  it("DISTRICT_REQUIRED and DISTRICT_FORBIDDEN", () => {
    const s: Scenario = { decisions: [...GOLDEN.decisions.slice(0, 3), { measureId: "M12", districtId: "esil" }, { measureId: "M5" }] };
    const codes = ok(s).errors.map((e) => e.code);
    expect(codes).toContain("DISTRICT_FORBIDDEN");
    expect(codes).toContain("DISTRICT_REQUIRED");
  });
  it("DIRECTION_CAP: at most two per direction", () => {
    const s: Scenario = { decisions: [
      { measureId: "M7", districtId: "nura" }, { measureId: "M8", districtId: "nura" }, { measureId: "M9", districtId: "esil" },
      { measureId: "M12" }, { measureId: "M10", districtId: "nura" },
    ] };
    expect(ok(s).errors.map((e) => e.code)).toContain("DIRECTION_CAP");
  });
  it("CONFLICT: M1 vs M3 anywhere, M4 vs M7 and M5 vs M13 only in the same district", () => {
    const anyDistrict: Scenario = { decisions: [
      { measureId: "M1", districtId: "esil" }, { measureId: "M3", districtId: "nura" }, { measureId: "M12" },
      { measureId: "M10", districtId: "nura" }, { measureId: "M9", districtId: "nura" },
    ] };
    expect(ok(anyDistrict).errors.map((e) => e.code)).toContain("CONFLICT");
    const sameDistrict: Scenario = { decisions: [
      { measureId: "M4", districtId: "nura" }, { measureId: "M7", districtId: "nura" }, { measureId: "M12" },
      { measureId: "M10", districtId: "nura" }, { measureId: "M14" },
    ] };
    expect(ok(sameDistrict).errors.map((e) => e.code)).toContain("CONFLICT");
    const differentDistrict: Scenario = { decisions: [
      { measureId: "M4", districtId: "esil" }, { measureId: "M7", districtId: "nura" }, { measureId: "M12" },
      { measureId: "M10", districtId: "nura" }, { measureId: "M14" },
    ] };
    expect(ok(differentDistrict).ok).toBe(true);
  });
  it("returns all violations at once", () => {
    const s: Scenario = { decisions: [
      { measureId: "M1", districtId: "esil" }, { measureId: "M3", districtId: "nura" }, { measureId: "M3", districtId: "nura" },
      { measureId: "M13", districtId: "almaty" },
    ] };
    const codes = new Set(ok(s).errors.map((e) => e.code));
    expect(codes.has("COUNT") && codes.has("BUDGET") && codes.has("DUPLICATE") && codes.has("CONFLICT")).toBe(true);
  });
});
