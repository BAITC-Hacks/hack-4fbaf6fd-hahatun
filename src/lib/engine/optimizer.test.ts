import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DISTRICTS, MEASURES } from "@/lib/data";
import { scoreOf } from "./engine";
import { fastScoreOf, getOptimum, isValidFast, optimize, percentileOf, resetOptimumMemory } from "./optimizer";
import { validate } from "./validator";
import type { Decision, Scenario } from "@/lib/types";

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

// Deterministic PRNG (mulberry32) so the sampled cases are reproducible.
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Mostly well-formed sets (5 distinct measures, correct scope) with occasional broken ones.
function randomScenario(r: () => number): Scenario {
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];
  const count = r() < 0.05 ? pick([4, 6]) : 5;
  const pool = [...MEASURES];
  const decisions: Decision[] = [];
  for (let i = 0; i < count; i++) {
    const m = r() < 0.03 && decisions.length > 0 ? MEASURES.find((x) => x.id === decisions[0].measureId)! : pool.splice(Math.floor(r() * pool.length), 1)[0];
    const wrongScope = r() < 0.03;
    const needsDistrict = (m.scope === "district") !== wrongScope;
    decisions.push(needsDistrict ? { measureId: m.id, districtId: pick(DISTRICTS).id } : { measureId: m.id });
  }
  return { decisions };
}

let dir: string;
let prevEnv: string | undefined;

beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "optimum-"));
  prevEnv = process.env.OPTIMUM_CACHE_PATH;
  process.env.OPTIMUM_CACHE_PATH = path.join(dir, "nested", "optimum.json");
  resetOptimumMemory();
});

afterAll(async () => {
  if (prevEnv === undefined) delete process.env.OPTIMUM_CACHE_PATH;
  else process.env.OPTIMUM_CACHE_PATH = prevEnv;
  resetOptimumMemory();
  await rm(dir, { recursive: true, force: true });
});

describe("fast validation and scoring", () => {
  it("isValidFast matches validate().ok on 2000 random sets", () => {
    const r = rng(42);
    let ok = 0;
    for (let i = 0; i < 2000; i++) {
      const s = randomScenario(r);
      const expected = validate(s).ok;
      expect(isValidFast(s.decisions), JSON.stringify(s)).toBe(expected);
      if (expected) ok++;
    }
    // Both branches must be exercised meaningfully.
    expect(ok).toBeGreaterThan(200);
    expect(ok).toBeLessThan(1800);
  });

  it("fastScoreOf matches engine scoreOf on random valid sets", () => {
    const r = rng(7);
    let checked = 0;
    while (checked < 500) {
      const s = randomScenario(r);
      if (!validate(s).ok) continue;
      expect(fastScoreOf(s.decisions)).toBeCloseTo(scoreOf(s.decisions), 9);
      checked++;
    }
    expect(fastScoreOf(GOLDEN.decisions)).toBeCloseTo(56.54, 2);
  });
});

describe("full enumeration", () => {
  it("computes once, writes the cache, then reuses it", async () => {
    const file = process.env.OPTIMUM_CACHE_PATH!;
    const first = await getOptimum();
    expect(first.source).toBe("computed");
    expect(await getOptimum()).toBe(first); // in-memory singleton
    expect(existsSync(file)).toBe(true);

    const disk = JSON.parse(await readFile(file, "utf8"));
    expect(disk.version).toMatch(/^v1-[0-9a-f]{12}$/);
    expect(disk.count).toBe(first.scores.length);

    resetOptimumMemory();
    const second = await getOptimum();
    expect(second.source).toBe("disk");
    expect(second.scores.length).toBe(first.scores.length);
    expect(second.bestScore).toBe(first.bestScore);
  });

  it("concurrent callers share one computation", async () => {
    const file = path.join(dir, "concurrent.json");
    const [a, b] = await Promise.all([getOptimum(file), getOptimum(file)]);
    expect(a).toBe(b);
  });

  it("recomputes when the cache version does not match", async () => {
    const file = path.join(dir, "stale.json");
    await writeFile(file, JSON.stringify({ version: "v0", count: 1, scores: [1], bestScore: 1, bestScenario: GOLDEN }));
    const o = await getOptimum(file);
    expect(o.source).toBe("computed");
  });

  it("global optimum is valid and not worse than any checked set", async () => {
    const o = await getOptimum();
    expect(validate(o.bestScenario).ok).toBe(true);
    expect(scoreOf(o.bestScenario.decisions)).toBeCloseTo(o.bestScore, 9);
    expect(o.bestScore).toBeGreaterThanOrEqual(scoreOf(GOLDEN.decisions));
    expect(o.bestScore).toBeGreaterThanOrEqual(scoreOf(NO_IMPROVEMENT.decisions));
    const r = rng(1);
    for (let i = 0; i < 300; i++) {
      const s = randomScenario(r);
      if (validate(s).ok) expect(o.bestScore).toBeGreaterThanOrEqual(scoreOf(s.decisions) - 1e-9);
    }
    expect(o.scores[o.scores.length - 1]).toBeCloseTo(o.bestScore, 3);
  });

  it("percentileOf is an upper-bound share over the sorted array", () => {
    const sorted = Float64Array.from([1, 2, 2, 3]);
    expect(percentileOf(sorted, 0)).toBe(0);
    expect(percentileOf(sorted, 2)).toBe(0.75);
    expect(percentileOf(sorted, 5)).toBe(1);
    expect(percentileOf(new Float64Array(0), 1)).toBe(0);
  });
});

describe("optimize", () => {
  it("finds the best single-swap improvement for the golden example", async () => {
    const r = await optimize(GOLDEN);

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

    expect(r.percentile).toBeGreaterThan(0);
    expect(r.percentile).toBeLessThan(1);
    expect(r.bestScore).toBeGreaterThanOrEqual(best.score);
    expect(validate(r.bestScenario).ok).toBe(true);
  });

  it("returns no improvements for a local optimum, but the global best is still reported", async () => {
    expect(validate(NO_IMPROVEMENT).ok).toBe(true);

    const r = await optimize(NO_IMPROVEMENT);

    expect(r.improvements).toEqual([]);
    expect(r.bestScore).toBeGreaterThanOrEqual(scoreOf(NO_IMPROVEMENT.decisions));
    expect(r.percentile).toBeGreaterThan(0);
    expect(r.percentile).toBeLessThanOrEqual(1);
  });

  it("the global optimum has percentile 1", async () => {
    const o = await getOptimum();
    const r = await optimize(o.bestScenario);
    expect(r.percentile).toBe(1);
    expect(r.improvements).toEqual([]);
  });

  it("never throws on an invalid scenario and still returns a well-formed result", async () => {
    const invalid: Scenario = { decisions: [{ measureId: "M1", districtId: "esil" }] }; // COUNT violation
    const r = await optimize(invalid);
    expect(r.percentile).toBeGreaterThanOrEqual(0);
    expect(r.percentile).toBeLessThanOrEqual(1);
    expect(r.improvements.length).toBeLessThanOrEqual(3);
    for (const imp of r.improvements) {
      expect(validate(imp.scenario).ok).toBe(true);
    }
  });
});
