import { describe, expect, it } from "vitest";
import { DEFAULT_DATASET, parseDataset } from "./dataset";

describe("dataset import", () => {
  it("accepts the case dataset as-is", () => {
    const r = parseDataset(JSON.parse(JSON.stringify(DEFAULT_DATASET)));
    expect(r.ok).toBe(true);
  });
  it("rejects wrong population sum, out-of-range values and missing measures", () => {
    const bad = JSON.parse(JSON.stringify(DEFAULT_DATASET));
    bad.districts[0].population = 0.5;
    bad.districts[1].indicators.T1 = 140;
    bad.measures.pop();
    const r = parseDataset(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThan(0);
  });
  it("rejects weights that do not sum to 1", () => {
    const bad = JSON.parse(JSON.stringify(DEFAULT_DATASET));
    bad.weights.T1 = 0.5;
    const r = parseDataset(bad);
    expect(r.ok).toBe(false);
  });
});
