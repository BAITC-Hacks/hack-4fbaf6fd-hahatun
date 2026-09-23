import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildFacts, calculate } from "@/lib/engine";
import type { ExpertOpinion, Fact, Improvement, Scenario } from "@/lib/types";

// server-only is provided by Next at build time and is absent in the vitest runtime.
vi.mock("server-only", () => ({}));
// Network is never touched: callStructured is replaced; isLlmEnabled stays real and reads the env.
vi.mock("./llm", async (importOriginal) => {
  const orig = await importOriginal<typeof import("./llm")>();
  return { ...orig, callStructured: vi.fn() };
});

const { callStructured, LlmUsage } = await import("./llm");
const { filterFactRefs, runExperts, sanitizeSuggestion } = await import("./experts");
const { synthesize } = await import("./synthesizer");
const { fallbackDraft } = await import("./fallback");
const { allowedNumbers, foreignNumbers } = await import("./numbers");

const GOLDEN: Scenario = {
  decisions: [
    { measureId: "M7", districtId: "nura" },
    { measureId: "M8", districtId: "nura" },
    { measureId: "M10", districtId: "nura" },
    { measureId: "M12" },
    { measureId: "M5", districtId: "saryarka" },
  ],
};
const IMPROVEMENT: Improvement = {
  scenario: { decisions: [...GOLDEN.decisions.slice(0, 4), { measureId: "M3", districtId: "nura" }] },
  score: 57.21,
  delta: 0.66,
  change: "M5 Сарыарка → M3 Нура",
};
const engine = calculate(GOLDEN);
const facts: Fact[] = buildFacts(GOLDEN, engine);
const input = { scenario: GOLDEN, facts, improvements: [IMPROVEMENT] };
const factIds = new Set(facts.map((f) => f.id));

let savedKey: string | undefined;
beforeEach(() => {
  savedKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "";
  vi.mocked(callStructured).mockReset();
});
afterEach(() => {
  process.env.OPENAI_API_KEY = savedKey;
});

describe("runExperts without a key", () => {
  it("returns 6 distinct roles with filled texts and valid factRefs, emitting each opinion", async () => {
    const seen: ExpertOpinion[] = [];
    const opinions = await runExperts(input, new LlmUsage(), (o) => seen.push(o));
    expect(opinions.map((o) => o.role)).toEqual(["transport", "ecology", "social", "safety", "service", "finance"]);
    expect(seen).toHaveLength(6);
    for (const o of opinions) {
      expect(o.summary.trim()).not.toBe("");
      expect(o.risk.trim()).not.toBe("");
      expect(o.tradeoff.trim()).not.toBe("");
      expect(o.factRefs.length).toBeGreaterThan(0);
      for (const ref of o.factRefs) expect(factIds.has(ref)).toBe(true);
    }
    expect(opinions.find((o) => o.role === "transport")!.stance).toBe("concern");
    expect(callStructured).not.toHaveBeenCalled();
  });
});

describe("runExperts with a key (mocked LLM)", () => {
  it("sanitizes answers and replaces a failed expert with its fallback", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.mocked(callStructured).mockImplementation(async (call) => {
      if (call.role === "expert:ecology") throw new Error("boom");
      return {
        summary: "ok", risk: "r", tradeoff: "t", factRefs: ["F1", "F999"], stance: "support",
        suggestion: { measureId: "M12", districtId: "nura" }, // city measure with a district -> dropped
      };
    });
    const opinions = await runExperts(input, new LlmUsage(), () => {});
    expect(callStructured).toHaveBeenCalledTimes(6);
    const transport = opinions[0];
    expect(transport.factRefs).toEqual(["F1"]);
    expect(transport.suggestion).toBeUndefined();
    expect(transport.name).toBe("Айгерим");
    const ecology = opinions[1];
    expect(ecology.role).toBe("ecology");
    expect(ecology.summary).not.toBe("ok");
  });
});

describe("filterFactRefs / sanitizeSuggestion", () => {
  const allowed: Fact[] = [
    { id: "F1", text: "a", scope: "general" },
    { id: "F2", text: "b", scope: "social" },
  ];
  it("drops unknown ids and duplicates, keeps order", () => {
    expect(filterFactRefs(["F2", "F7", " F1", "F2"], allowed)).toEqual(["F2", "F1"]);
    expect(filterFactRefs([], allowed)).toEqual([]);
  });
  it("keeps only scope-consistent suggestions", () => {
    expect(sanitizeSuggestion({ measureId: "M3", districtId: "nura" })).toEqual({ measureId: "M3", districtId: "nura" });
    expect(sanitizeSuggestion({ measureId: "M3", districtId: null })).toBeUndefined();
    expect(sanitizeSuggestion({ measureId: "M12", districtId: null })).toEqual({ measureId: "M12" });
    expect(sanitizeSuggestion({ measureId: "M12", districtId: "esil" })).toBeUndefined();
    expect(sanitizeSuggestion({ measureId: "M99" })).toBeUndefined();
    expect(sanitizeSuggestion(null)).toBeUndefined();
  });
});

describe("synthesize without a key", () => {
  it("returns draft v1, then v2 on a revision round", async () => {
    const opinions = await runExperts(input, new LlmUsage(), () => {});
    const v1 = await synthesize({ ...input, opinions }, new LlmUsage());
    expect(v1.version).toBe(1);
    expect(v1.text.trim()).not.toBe("");
    expect(v1.recommendation.improvement).toEqual(IMPROVEMENT);
    const v2 = await synthesize(
      { ...input, opinions, previous: { draft: v1, failed: [{ id: "C3", by: "llm", passed: false, reason: "x" }] } },
      new LlmUsage(),
    );
    expect(v2.version).toBe(2);
    expect(callStructured).not.toHaveBeenCalled();
  });

  it("fallback draft passes the C1 number check and has 4-6 sentences", () => {
    const d = fallbackDraft(input);
    expect(foreignNumbers(d.text, allowedNumbers(facts))).toEqual([]);
    expect(foreignNumbers(d.recommendation.text, allowedNumbers(facts))).toEqual([]);
    const sentences = d.text.split(/(?<=[.!?])\s+/).filter(Boolean);
    expect(sentences.length).toBeGreaterThanOrEqual(4);
    expect(sentences.length).toBeLessThanOrEqual(6);
    for (const list of [d.strengths, d.risks, d.consequences]) expect(list.length).toBeGreaterThanOrEqual(2);
    expect(d.text).toContain("Нура");
  });
});
