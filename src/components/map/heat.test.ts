import { describe, expect, it } from "vitest";
import { HEAT_MAX, HEAT_MIN, heatColor, heatShare } from "./heat";

describe("heat scale", () => {
  it("clamps D to the fixed domain", () => {
    expect(heatShare(30)).toBe(0);
    expect(heatShare(80)).toBe(1);
    expect(heatColor(30)).toBe(heatColor(HEAT_MIN));
    expect(heatColor(80)).toBe(heatColor(HEAT_MAX));
  });

  it("orders low → mid → high along the outcome tokens", () => {
    expect(heatShare(55)).toBe(0.5);
    const shares = [45, 49.18, 54.65, 56.63, 62.99, 65].map(heatShare);
    expect(shares).toEqual([...shares].sort((a, b) => a - b));
    expect(heatColor(HEAT_MIN)).toContain("var(--outcome-conditions) 0%, var(--outcome-return)");
    expect(heatColor(55)).toContain("var(--outcome-approve) 0%, var(--outcome-conditions)");
    expect(heatColor(HEAT_MAX)).toContain("var(--outcome-approve) 100%");
  });
});
