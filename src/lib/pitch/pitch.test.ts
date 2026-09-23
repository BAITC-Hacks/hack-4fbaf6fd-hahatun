import { describe, expect, it } from "vitest";
import live from "../../../fixtures/live-run.json";
import { MEASURE_BY_ID } from "@/lib/data/measures";
import type { Run } from "@/lib/types";
import { buildPitch } from "./pitch";

const run = live as Run;

describe("buildPitch", () => {
  it("includes the team name, the Score, all five measure titles and the resolution outcome", () => {
    const md = buildPitch(run);
    expect(md).toContain(run.teamName);
    expect(md).toContain("56.54");
    for (const decision of run.scenario.decisions) {
      expect(md).toContain(MEASURE_BY_ID[decision.measureId].title);
    }
    expect(md).toContain("Утвердить");
    expect(md).toContain("Расход:");
  });

  it("has no undefined or NaN artifacts", () => {
    const md = buildPitch(run);
    expect(md).not.toContain("undefined");
    expect(md).not.toContain("NaN");
  });

  it("marks a fallback (no-LLM) run", () => {
    const fallbackRun: Run = { ...run, llmEnabled: false };
    const md = buildPitch(fallbackRun);
    expect(md).toContain("фолбэк");
    expect(md).not.toContain("undefined");
    expect(md).not.toContain("NaN");
  });
});
