import { describe, expect, it } from "vitest";
import sample from "../../../fixtures/sample-run.json";
import type { Run } from "@/lib/types";
import { listRuns, toSummary } from "./run-source";

describe("toSummary", () => {
  it("extracts leaderboard fields from the fixture", () => {
    const s = toSummary(sample as Run);
    expect(s.score).toBe(56.54);
    expect(s.outcome).toBe("approve");
    expect(s.reviewPassed).toBe(6);
    expect(s.weakestDistrict).toBe("nura");
    expect(s.isSample).toBe(false);
  });
});

describe("listRuns", () => {
  it("is never empty and sorted by score desc", async () => {
    const runs = await listRuns();
    expect(runs.length).toBeGreaterThan(0);
    expect(runs.every((r, i) => i === 0 || runs[i - 1].score >= r.score)).toBe(true);
  });
});
