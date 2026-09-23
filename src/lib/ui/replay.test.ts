import { describe, expect, it } from "vitest";
import sample from "../../../fixtures/sample-run.json";
import type { ConsiliumEvent, Run, Stage } from "@/lib/types";
import { fixtureEvents, replayEvents } from "./replay";
import { EMPTY_LIVE_RUN, reduceLiveRun } from "./run-stream";

const run = sample as Run;
const STAGES: Stage[] = ["validate", "engine", "optimize", "experts", "draft", "review", "arbiter", "persist"];

describe("fixtureEvents", () => {
  it("rebuilds the full run with every stage done", () => {
    const state = fixtureEvents(run).reduce(reduceLiveRun, EMPTY_LIVE_RUN);
    expect(state.opinions).toHaveLength(6);
    expect(state.drafts.map((d) => d.version)).toEqual([1, 2]);
    expect(state.reviews.map((r) => r.round)).toEqual([1, 2]);
    expect(state.resolution?.outcome).toBe(run.resolution.outcome);
    expect(state.runId).toBe(run.id);
    for (const stage of STAGES) expect(state.stages[stage]).toBe("done");
  });

  it("alternates drafts and reviews and ends with done", () => {
    const payload = fixtureEvents(run)
      .filter((e) => e.type === "draft" || e.type === "review" || e.type === "done")
      .map((e) => e.type);
    expect(payload).toEqual(["draft", "review", "draft", "review", "done"]);
  });
});

describe("replayEvents", () => {
  it("yields every event and stops on abort", async () => {
    const events = fixtureEvents(run);
    const all: ConsiliumEvent[] = [];
    for await (const e of replayEvents(events, 0)) all.push(e);
    expect(all).toEqual(events);

    const controller = new AbortController();
    const some: ConsiliumEvent[] = [];
    for await (const e of replayEvents(events, 0, controller.signal)) {
      some.push(e);
      if (some.length === 3) controller.abort();
    }
    expect(some).toHaveLength(3);
  });
});
