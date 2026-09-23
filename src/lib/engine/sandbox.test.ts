import { describe, expect, it } from "vitest";
import live from "../../../fixtures/live-run.json";
import { DEFAULT_DATASET, DEFAULT_DATASET_NAME, isDefaultDataset, parseDataset, type Dataset } from "@/lib/dataset";
import type { Run, Scenario } from "@/lib/types";
import { calculate, scoreOf } from "./engine";
import { buildEvent } from "./events";
import { buildFacts } from "./facts";
import { optimize } from "./optimizer";
import { timeline } from "./timeline";
import { validate } from "./validator";

function cloneDefault(name = "Тестовая песочница"): Dataset {
  return { ...structuredClone(DEFAULT_DATASET), name };
}

// Nura S1 38 → 60: one of the two base criticals (Nura S1, Nura S2) disappears.
function nuraSchools(): Dataset {
  const ds = cloneDefault();
  ds.districts.find((d) => d.id === "nura")!.indicators.S1 = 60;
  return ds;
}

// Does not touch Nura's social indicators.
const NO_NURA: Scenario = {
  decisions: [
    { measureId: "M1", districtId: "esil" },
    { measureId: "M2" },
    { measureId: "M4", districtId: "saryarka" },
    { measureId: "M10", districtId: "almaty" },
    { measureId: "M12" },
  ],
};

describe("sandbox dataset through the engine", () => {
  it("calculate uses the dataset's indicators", () => {
    const base = calculate(NO_NURA);
    const sandbox = calculate(NO_NURA, [], nuraSchools());
    expect(base.nCrit).toBe(2);
    expect(sandbox.nCrit).toBe(1);
    expect(sandbox.score).not.toBeCloseTo(base.score, 6);
    expect(sandbox.baseScore).not.toBeCloseTo(base.baseScore, 6);
    expect(scoreOf(NO_NURA.decisions, [], nuraSchools())).toBeCloseTo(sandbox.score, 9);
    expect(timeline(NO_NURA, nuraSchools())[8].score).toBeCloseTo(sandbox.score, 9);
  });

  it("a clone of the case data reproduces the default numbers exactly", () => {
    const scenario = (live as Run).scenario;
    expect(calculate(scenario, [], cloneDefault())).toEqual(calculate(scenario));
  });

  it("validate uses the dataset's costs", () => {
    const scenario: Scenario = {
      decisions: [
        { measureId: "M3", districtId: "nura" },
        { measureId: "M7", districtId: "nura" },
        { measureId: "M10", districtId: "nura" },
        { measureId: "M12" },
        { measureId: "M4", districtId: "esil" },
      ],
    };
    expect(validate(scenario).ok).toBe(true);
    const ds = cloneDefault();
    ds.measures.find((m) => m.id === "M3")!.cost = 90;
    const res = validate(scenario, ds);
    expect(res.ok).toBe(false);
    expect(res.errors.map((e) => e.code)).toContain("BUDGET");
  });

  it("buildFacts takes measure titles from the dataset", () => {
    const ds = cloneDefault();
    ds.measures.find((m) => m.id === "M12")!.title = "Портал жалоб";
    const facts = buildFacts(NO_NURA, calculate(NO_NURA, [], ds), undefined, ds);
    expect(facts.some((f) => f.text.includes("«Портал жалоб»"))).toBe(true);
  });

  it("optimize enumerates the sandbox and returns valid improvements", async () => {
    const ds = nuraSchools();
    const t0 = Date.now();
    const res = await optimize(NO_NURA, ds);
    const elapsed = Date.now() - t0;
    const userScore = scoreOf(NO_NURA.decisions, [], ds);
    expect(res.improvements.length).toBeGreaterThan(0);
    for (const imp of res.improvements) {
      expect(validate(imp.scenario, ds).ok).toBe(true);
      expect(scoreOf(imp.scenario.decisions, [], ds)).toBeCloseTo(imp.score, 9);
      expect(imp.score).toBeGreaterThan(userScore);
    }
    expect(validate(res.bestScenario, ds).ok).toBe(true);
    expect(scoreOf(res.bestScenario.decisions, [], ds)).toBeCloseTo(res.bestScore, 9);
    expect(res.bestScore).toBeGreaterThanOrEqual(res.improvements[0].score - 1e-9);
    expect(res.percentile).toBeGreaterThan(0);
    expect(res.percentile).toBeLessThan(1);
    expect(elapsed).toBeLessThan(15_000);
    // second call is served from the in-memory cache
    const t1 = Date.now();
    await optimize(NO_NURA, ds);
    expect(Date.now() - t1).toBeLessThan(elapsed + 50);
  }, 30_000);

  it("the sandbox enumeration on a clone matches the case optimum", async () => {
    const [a, b] = await Promise.all([optimize(NO_NURA), optimize(NO_NURA, cloneDefault("Клон кейса"))]);
    expect(b.bestScore).toBeCloseTo(a.bestScore, 9);
    expect(b.percentile).toBeCloseTo(a.percentile, 9);
  }, 30_000);

  it("buildEvent works on a sandbox run", () => {
    const ds = nuraSchools();
    const base = live as Run;
    const run: Run = {
      ...base,
      engine: calculate(base.scenario, [], ds),
      sandbox: { datasetName: ds.name, dataset: ds },
    };
    const ev = buildEvent(run);
    expect(ev.scoreAfter).toBeCloseTo(scoreOf(run.scenario.decisions, [ev.shock], ds), 9);
    if (ev.suggestion) expect(validate(ev.suggestion.scenario, ds).ok).toBe(true);
  });
});

describe("dataset parsing", () => {
  it("rejects an invalid dataset with readable issues", () => {
    const bad = structuredClone(DEFAULT_DATASET) as unknown as { districts: { population: number }[] };
    bad.districts[0].population = 0.9;
    const res = parseDataset(bad);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.length).toBeGreaterThan(0);
    expect(parseDataset({ name: "x" }).ok).toBe(false);
  });

  it("accepts the case data", () => {
    const res = parseDataset(structuredClone(DEFAULT_DATASET));
    expect(res.ok).toBe(true);
  });

  it("the case name with other numbers is still a sandbox", () => {
    const spoof = nuraSchools();
    spoof.name = DEFAULT_DATASET_NAME;
    expect(isDefaultDataset(spoof)).toBe(false);
    expect(isDefaultDataset(cloneDefault(DEFAULT_DATASET_NAME))).toBe(true);
    expect(isDefaultDataset(undefined)).toBe(true);
  });
});
