import { describe, expect, it } from "vitest";
import sample from "../../fixtures/sample-run.json";
import type { Run } from "./types";

// Guards the UI fixture against drifting from the contract in types.ts.
const run: Run = sample as Run;

describe("fixtures/sample-run.json", () => {
  it("matches the dataset golden numbers", () => {
    expect(run.engine.baseScore).toBe(52.56);
    expect(run.engine.score).toBe(56.54);
    expect(run.engine.nCrit).toBe(0);
    expect(run.scenario.decisions).toHaveLength(5);
  });
  it("references only existing facts", () => {
    const ids = new Set(run.facts.map((f) => f.id));
    for (const o of run.opinions) for (const ref of o.factRefs) expect(ids.has(ref)).toBe(true);
    for (const d of run.resolution.disputes) for (const ref of d.factRefs) expect(ids.has(ref)).toBe(true);
  });
});
