import { describe, expect, it } from "vitest";
import sample from "../../../fixtures/sample-run.json";
import type { ConsiliumEvent, Run } from "@/lib/types";
import { EMPTY_LIVE_RUN, parseSse, reduceLiveRun } from "./run-stream";

const run = sample as Run;

describe("parseSse", () => {
  it("parses complete events and keeps the tail", () => {
    const a = JSON.stringify({ type: "stage", stage: "validate", status: "start" });
    const { events, rest } = parseSse(`data: ${a}\n\ndata: {"type":"do`);
    expect(events).toEqual([{ type: "stage", stage: "validate", status: "start" }]);
    expect(rest).toBe('data: {"type":"do');
  });
  it("turns broken JSON into an error event", () => {
    expect(parseSse("data: {oops\n\n").events[0].type).toBe("error");
  });
});

describe("reduceLiveRun", () => {
  it("rebuilds the fixture run from its events", () => {
    const events: ConsiliumEvent[] = [
      { type: "stage", stage: "engine", status: "done" },
      { type: "engine", result: run.engine, facts: run.facts },
      { type: "optimizer", result: run.optimizer },
      ...run.opinions.map((opinion) => ({ type: "expert" as const, opinion })),
      ...run.drafts.map((draft) => ({ type: "draft" as const, draft })),
      ...run.reviews.map((review) => ({ type: "review" as const, review })),
      { type: "resolution", resolution: run.resolution },
      { type: "done", runId: run.id },
    ];
    const state = events.reduce(reduceLiveRun, EMPTY_LIVE_RUN);
    expect(state.engine?.score).toBe(56.54);
    expect(state.opinions).toHaveLength(6);
    expect(state.drafts).toHaveLength(2);
    expect(state.reviews.map((r) => r.passed)).toEqual([4, 6]);
    expect(state.resolution?.outcome).toBe("approve");
    expect(state.runId).toBe(run.id);
    expect(state.stages.engine).toBe("done");
  });
});
