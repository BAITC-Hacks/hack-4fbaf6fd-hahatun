import { describe, expect, it } from "vitest";
import { allowedNumbers, extractNumbers, foreignNumbers, isAllowed } from "./numbers";

const values = (text: string) => extractNumbers(text).map((t) => t.value);

describe("extractNumbers", () => {
  it("reads decimals with comma and dot, signs and percents", () => {
    expect(values("поликлиники 43,75")).toEqual([43.75]);
    expect(values("вклад −1.2 и -0.5")).toEqual([-1.2, -0.5]);
    expect(values("дельта +3.98")).toEqual([3.98]);
    expect(values("бюджет использован на 95%")).toEqual([95]);
    expect(extractNumbers("95%")[0].raw).toBe("95%");
  });

  it("ignores identifiers, ordinals, years and digits inside words", () => {
    expect(values("M7 и F12, S1 T2 E1 B2 C1")).toEqual([]);
    expect(values("Улучшение №1 и № 2")).toEqual([]);
    expect(values("к 2026 году")).toEqual([]);
    expect(values("5G, x10, 3D")).toEqual([]);
    expect(values("синергия M10+M12")).toEqual([]);
  });

  it("keeps sentence-ending numbers and fractions", () => {
    expect(values("Score 56.54. Остаток 5.")).toEqual([56.54, 5]);
    expect(values("реализовано 5/8 эффекта")).toEqual([5, 8]);
    expect(values("школы с 38 до 48, поликлиники")).toEqual([38, 48]);
  });
});

describe("isAllowed", () => {
  const allowed = allowedNumbers([
    { id: "F1", text: "Итоговый Score 56.54, база 52.56, дельта +3.99", value: 56.54, scope: "general" },
    { id: "F2", text: "Нура S2: 35 → 43.75", value: 43.75, scope: "social" },
    { id: "F3", text: "Вклад M7 в Score: −1.2", value: -1.2, scope: "social" },
  ]);

  it("matches exact values, numbers from fact texts and rounded forms", () => {
    expect(foreignNumbers("Score 56.54 против 52.56, дельта +3.99, S2 с 35 до 43,75", allowed)).toEqual([]);
    expect(foreignNumbers("около 43.8 и снижение на 1.2", allowed)).toEqual([]);
  });

  it("separates close but different values", () => {
    const [t] = extractNumbers("57.21");
    expect(isAllowed(t, allowed)).toBe(false);
    expect(foreignNumbers("Score 99.9", allowed).map((x) => x.raw)).toEqual(["99.9"]);
  });
});
