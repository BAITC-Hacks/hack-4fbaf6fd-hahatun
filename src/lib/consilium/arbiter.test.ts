import { beforeAll, describe, expect, it, vi } from "vitest";
import { buildFacts, calculate } from "@/lib/engine";
import type { Draft, ExpertOpinion, Improvement, Review, Scenario } from "@/lib/types";
import sample from "../../../fixtures/sample-run.json";
import { arbitrate, decideOutcome } from "./arbiter";
import { LlmUsage } from "./llm";

vi.mock("server-only", () => ({}));

const GOLDEN: Scenario = {
  decisions: [
    { measureId: "M7", districtId: "nura" },
    { measureId: "M8", districtId: "nura" },
    { measureId: "M10", districtId: "nura" },
    { measureId: "M12" },
    { measureId: "M5", districtId: "saryarka" },
  ],
};
const engine = calculate(GOLDEN);
const facts = buildFacts(GOLDEN, engine);

const reviewOf = (passed: number): Review => ({
  round: 1,
  conditions: (["C1", "C2", "C3", "C4", "C5", "C6"] as const).map((id, i) => ({ id, by: "code", passed: i < passed, reason: "—" })),
  passed,
  total: 6,
  ok: passed >= 5,
});

const IMPROVEMENT: Improvement = {
  scenario: { decisions: [...GOLDEN.decisions.slice(0, 4), { measureId: "M3", districtId: "nura" }] },
  score: 57.21,
  delta: 0.66,
  change: "M5 Сарыарка → M3 ЛРТ Нура",
};

beforeAll(() => {
  process.env.OPENAI_API_KEY = "";
});

describe("decideOutcome", () => {
  it("approves the golden scenario with an ok review", () => {
    expect(engine.delta).toBeGreaterThan(0);
    expect(engine.nCrit).toBe(0);
    expect(decideOutcome(engine, reviewOf(6))).toBe("approve");
  });

  it("returns when the review is not ok, even with good numbers", () => {
    expect(decideOutcome(engine, reviewOf(4))).toBe("return");
  });

  it("returns when delta is not positive", () => {
    expect(decideOutcome({ ...engine, delta: 0 }, reviewOf(6))).toBe("return");
  });

  it("approves with conditions when criticals remain or the weakest district did not grow", () => {
    expect(decideOutcome({ ...engine, nCrit: 1 }, reviewOf(6))).toBe("approve_with_conditions");
    const flat = engine.districts.map((d) => (d.id === engine.minDistrict.id ? { ...d, dAfter: d.dBefore } : d));
    expect(decideOutcome({ ...engine, districts: flat }, reviewOf(5))).toBe("approve_with_conditions");
  });
});

describe("arbitrate without LLM", () => {
  const opinions = sample.opinions as ExpertOpinion[];
  const draft = sample.drafts[1] as Draft;

  it("returns a deterministic resolution with the chosen outcome", async () => {
    const usage = new LlmUsage();
    const r = await arbitrate({ engine, facts, opinions, draft, review: reviewOf(6), improvements: [IMPROVEMENT] }, usage);
    expect(r.outcome).toBe("approve");
    expect(r.justification).toContain("Итоговый Score");
    expect(r.mandates).toEqual([{ improvement: IMPROVEMENT, text: expect.stringContaining("M3") }]);
    expect(r.caveat).toBeUndefined();
    expect(r.disputes.length).toBeGreaterThan(0);
    const supportRoles = opinions.filter((o) => o.stance === "support").map((o) => o.role);
    for (const d of r.disputes) {
      expect(supportRoles).toContain(d.sideTaken);
      for (const id of d.factRefs) expect(facts.some((f) => f.id === id)).toBe(true);
    }
    expect(usage.traces).toHaveLength(0);
  });

  it("sides with concerns, adds a mandate and a caveat when returning or conditional", async () => {
    const ret = await arbitrate({ engine, facts, opinions, draft, review: reviewOf(4), improvements: [IMPROVEMENT] }, new LlmUsage());
    expect(ret.outcome).toBe("return");
    expect(ret.caveat).toMatch(/4 из 6/);
    const concernRoles = opinions.filter((o) => o.stance === "concern").map((o) => o.role);
    for (const d of ret.disputes) expect(concernRoles).toContain(d.sideTaken);

    const cond = await arbitrate(
      { engine: { ...engine, nCrit: 1 }, facts, opinions, draft, review: reviewOf(5), improvements: [IMPROVEMENT] },
      new LlmUsage(),
    );
    expect(cond.outcome).toBe("approve_with_conditions");
    expect(cond.mandates[0].text).toMatch(/^Обязательное поручение:/);
  });

  it("has no mandates when there are no improvements", async () => {
    const r = await arbitrate({ engine, facts, opinions, draft, review: reviewOf(6), improvements: [] }, new LlmUsage());
    expect(r.mandates).toEqual([]);
  });
});
