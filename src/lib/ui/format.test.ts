import { describe, expect, it } from "vitest";
import { formatCost, formatDelta, formatPercent, formatScore, formatValue, trendOf } from "./format";

describe("ui formatters", () => {
  it("formats score with two decimals", () => {
    expect(formatScore(56.5432)).toBe("56.54");
    expect(formatScore(52.56)).toBe("52.56");
  });
  it("formats signed deltas with a real minus", () => {
    expect(formatDelta(3.984)).toBe("+3.98");
    expect(formatDelta(-0.5)).toBe("−0.5");
    expect(formatDelta(0.001)).toBe("0");
  });
  it("trims indicator values", () => {
    expect(formatValue(48)).toBe("48");
    expect(formatValue(43.75)).toBe("43.75");
  });
  it("formats cost and percent", () => {
    expect(formatCost(95)).toBe("95 у.е.");
    expect(formatPercent(0.91)).toBe("91%");
  });
  it("detects trend", () => {
    expect(trendOf(1)).toBe("up");
    expect(trendOf(-1)).toBe("down");
    expect(trendOf(0.001)).toBe("flat");
  });
});
