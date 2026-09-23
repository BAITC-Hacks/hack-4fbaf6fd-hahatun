import { describe, expect, it } from "vitest";
import live from "../../../fixtures/live-run.json";
import { DISTRICTS } from "@/lib/data";
import type { Run } from "@/lib/types";
import { calculate, scoreOf } from "./engine";
import { EVENT_CATALOGUE, buildEvent, pickEventIndex } from "./events";
import { validate } from "./validator";

const run = live as Run;
// live-run.json holds the dataset golden set (M7/M8/M10 Нура, M12, M5 Сарыарка).
const GOLDEN = run.scenario;

// First id "run-N" hitting each catalogue index.
function idsPerIndex(): string[] {
  const ids: string[] = [];
  for (let n = 0; ids.filter(Boolean).length < EVENT_CATALOGUE.length && n < 1000; n++) {
    const id = `run-${n}`;
    const idx = pickEventIndex(id);
    if (!ids[idx]) ids[idx] = id;
  }
  return ids;
}

describe("city events (A14)", () => {
  it("is deterministic for the same run", () => {
    expect(buildEvent(run)).toEqual(buildEvent(run));
  });

  it("damages the score and targets the rule's district", () => {
    const ev = buildEvent(run);
    const tpl = EVENT_CATALOGUE[pickEventIndex(run.id)];
    expect(ev.id).toBe(tpl.id);
    expect(ev.shock.indicator).toBe(tpl.indicator);
    expect(ev.scoreBefore).toBe(run.engine.score);
    expect(ev.scoreAfter).toBeLessThan(ev.scoreBefore);
    const values = run.engine.districts.map((d) => d.after[tpl.indicator]).sort((a, b) => a - b);
    const hit = run.engine.districts.find((d) => d.id === ev.shock.districtId)!.after[tpl.indicator];
    if (tpl.target === "min") expect(hit).toBe(values[0]);
    else expect(hit).toBeLessThanOrEqual(values[1]);
  });

  it("suggests a valid swap that beats the shocked score", () => {
    const ev = buildEvent(run);
    if (!ev.suggestion) return;
    expect(validate(ev.suggestion.scenario).ok).toBe(true);
    expect(ev.suggestion.score).toBeGreaterThan(ev.scoreAfter);
    expect(ev.suggestion.score).toBeCloseTo(scoreOf(ev.suggestion.scenario.decisions, [ev.shock]), 9);
    expect(ev.suggestion.delta).toBeCloseTo(ev.suggestion.score - ev.scoreAfter, 9);
  });

  it("covers all six events without throwing", () => {
    const ids = idsPerIndex();
    expect(ids.filter(Boolean)).toHaveLength(6);
    for (const [i, id] of ids.entries()) {
      const ev = buildEvent({ ...run, id });
      expect(ev.id).toBe(EVENT_CATALOGUE[i].id);
      expect(ev.scoreAfter).toBeLessThanOrEqual(ev.scoreBefore);
    }
  });

  it("picks the more populous of the two worst districts for the flood", () => {
    const id = idsPerIndex()[EVENT_CATALOGUE.findIndex((e) => e.target === "populousOfTwoWorst")];
    const ev = buildEvent({ ...run, id });
    const two = [...run.engine.districts].sort((a, b) => a.after.T1 - b.after.T1).slice(0, 2);
    const pop = (d: string) => DISTRICTS.find((x) => x.id === d)!.population;
    const expected = pop(two[1].id) > pop(two[0].id) ? two[1].id : two[0].id;
    expect(ev.shock.districtId).toBe(expected);
  });
});

describe("engine with shocks", () => {
  it("keeps the golden score without shocks", () => {
    expect(calculate(GOLDEN).score).toBeCloseTo(56.54, 2);
  });

  it("clips a -100 shock to 0", () => {
    const r = calculate(GOLDEN, [{ districtId: "nura", indicator: "S2", delta: -100 }]);
    expect(r.districts.find((d) => d.id === "nura")!.after.S2).toBe(0);
    expect(r.nCrit).toBeGreaterThan(calculate(GOLDEN).nCrit);
  });
});
