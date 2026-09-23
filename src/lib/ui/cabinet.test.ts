import { describe, expect, it } from "vitest";
import type { Decision } from "@/lib/types";
import { relationHints, sanitizeDecisions, summarizeSet } from "./cabinet";
import { formatScore } from "./format";

// Example set from docs/source/dataset.md §3.
const EXAMPLE: Decision[] = [
  { measureId: "M7", districtId: "nura" },
  { measureId: "M8", districtId: "nura" },
  { measureId: "M10", districtId: "nura" },
  { measureId: "M12" },
  { measureId: "M5", districtId: "saryarka" },
];

describe("cabinet summary", () => {
  it("scores the dataset example at 56.54", () => {
    const s = summarizeSet(EXAMPLE);
    expect(s.validation.ok).toBe(true);
    expect(s.validation.cost).toBe(95);
    expect(s.errors).toEqual([]);
    expect(formatScore(s.score!)).toBe("56.54");
    expect(s.directionCounts).toMatchObject({ social: 2, safety: 1, service: 1, ecology: 1, transport: 0 });
  });

  it("keeps quiet about COUNT while the set is incomplete", () => {
    const s = summarizeSet(EXAMPLE.slice(0, 3));
    expect(s.validation.ok).toBe(false);
    expect(s.score).toBeNull();
    expect(s.errors).toEqual([]);
  });

  it("reports overspend and a sixth measure", () => {
    const s = summarizeSet([...EXAMPLE, { measureId: "M3", districtId: "nura" }]);
    expect(s.validation.cost).toBe(125);
    expect(s.errors.map((e) => e.code)).toEqual(expect.arrayContaining(["COUNT", "BUDGET"]));
    expect(s.score).toBeNull();
  });

  it("sanitizes shared or prefilled sets", () => {
    const input = [{ measureId: "M12", districtId: "nura" }, { measureId: "M7" }, { measureId: "M7", districtId: "esil" }] as Decision[];
    expect(sanitizeDecisions(input)).toEqual([{ measureId: "M12" }, { measureId: "M7" }]);
  });

  it("names measures by title in errors and hints only against the current set", () => {
    const s = summarizeSet([{ measureId: "M1", districtId: "esil" }, { measureId: "M3", districtId: "nura" }]);
    expect(s.errors.map((e) => e.message)).toContain(
      "«Выделенные полосы для автобусов» и «Линия ЛРТ / расширение» несовместимы: Либо BRT, либо ЛРТ, в любом районе",
    );
    expect(relationHints("M10", [])).toEqual([]);
    expect(relationHints("M10", [{ measureId: "M12" }])).toEqual([
      { tone: "synergy", text: "Вместе с «Единая цифровая платформа обращений»: +2 к безопасности улиц" },
    ]);
    expect(relationHints("M7", [{ measureId: "M4", districtId: "nura" }])[0].tone).toBe("conflict");
  });
});
