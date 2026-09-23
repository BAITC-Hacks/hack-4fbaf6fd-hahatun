import { describe, expect, it } from "vitest";
import { HEAT_MAX, HEAT_MIN, heatColor, heatShare } from "./heat";

describe("heat scale", () => {
  it("clamps D to the fixed domain", () => {
    expect(heatShare(30)).toBe(0);
    expect(heatShare(80)).toBe(1);
    expect(heatColor(30)).toBe(heatColor(HEAT_MIN));
    expect(heatColor(80)).toBe(heatColor(HEAT_MAX));
  });

  it("diverges clay → neutral → sky around the middle of the domain", () => {
    expect(heatShare(55)).toBe(0.5);
    const shares = [45, 49.18, 54.65, 56.63, 62.99, 65].map(heatShare);
    expect(shares).toEqual([...shares].sort((a, b) => a - b));
    expect(heatColor(HEAT_MIN)).toBe("color-mix(in oklch, var(--outcome-return) 42%, var(--muted))");
    expect(heatColor(50)).toContain("var(--outcome-return) 21%");
    expect(heatColor(55)).toContain(" 0%, var(--muted)");
    expect(heatColor(HEAT_MAX)).toBe("color-mix(in oklch, var(--sky) 42%, var(--muted))");
  });
});
