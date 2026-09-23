import { beforeEach, describe, expect, it, vi } from "vitest";
import sample from "../../../fixtures/sample-run.json";
import type { ConsiliumEvent, Review, Run, Scenario } from "@/lib/types";
import { optimize } from "@/lib/engine/optimizer";
import { saveRun } from "@/lib/store/runs";
import { arbitrate } from "./arbiter";
import { runExperts } from "./experts";
import { review } from "./reviewers";
import { synthesize } from "./synthesizer";
import { runConsilium } from "./pipeline";
import { DEFAULT_DATASET } from "@/lib/dataset";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/engine/optimizer", () => ({ optimize: vi.fn() }));
vi.mock("@/lib/consilium/experts", () => ({ runExperts: vi.fn() }));
vi.mock("@/lib/consilium/synthesizer", () => ({ synthesize: vi.fn() }));
vi.mock("@/lib/consilium/reviewers", () => ({ review: vi.fn() }));
vi.mock("@/lib/consilium/arbiter", () => ({ arbitrate: vi.fn() }));
vi.mock("@/lib/store/runs", () => ({ saveRun: vi.fn() }));

const fx = sample as unknown as Run;
const scenario: Scenario = fx.scenario;
const [draftV1, draftV2] = fx.drafts;
const failedReview: Review = { ...fx.reviews[0], ok: false };
const okReview: Review = { ...fx.reviews[1], ok: true };

function collect() {
  const events: ConsiliumEvent[] = [];
  return { events, emit: (e: ConsiliumEvent) => events.push(e) };
}

// Compact trace: "stage:experts:start", "expert", "draft", ...
const trace = (events: ConsiliumEvent[]) =>
  events.map((e) => (e.type === "stage" ? `stage:${e.stage}:${e.status}` : e.type));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(optimize).mockResolvedValue(fx.optimizer);
  vi.mocked(runExperts).mockImplementation(async (_input, _usage, onOpinion) => {
    fx.opinions.forEach(onOpinion);
    return fx.opinions;
  });
  vi.mocked(synthesize).mockImplementation(async (input) => (input.previous ? draftV2 : draftV1));
  vi.mocked(arbitrate).mockResolvedValue(fx.resolution);
  vi.mocked(saveRun).mockResolvedValue();
});

describe("runConsilium", () => {
  it("streams stages in order and persists the run after a revision", async () => {
    vi.mocked(review).mockResolvedValueOnce(failedReview).mockResolvedValueOnce(okReview);
    const { events, emit } = collect();

    const run = await runConsilium({ teamName: "Демо", scenario }, emit);

    expect(trace(events)).toEqual([
      "stage:validate:start", "stage:validate:done",
      "stage:engine:start", "stage:engine:done",
      "stage:optimize:start", "stage:optimize:done",
      "engine", "optimizer",
      "stage:experts:start", ...Array(6).fill("expert"), "stage:experts:done",
      "stage:draft:start", "draft", "stage:draft:done",
      "stage:review:start", "review", "stage:review:done",
      "stage:draft:start", "draft", "stage:draft:done",
      "stage:review:start", "review", "stage:review:done",
      "stage:arbiter:start", "resolution", "stage:arbiter:done",
      "stage:persist:start", "stage:persist:done",
      "done",
    ]);
    const draftStages = events.filter((e) => e.type === "stage" && e.stage === "draft" && e.status === "start");
    expect(draftStages.map((e) => (e.type === "stage" ? e.message : ""))).toEqual(["круг 1", "круг 2"]);

    expect(synthesize).toHaveBeenCalledTimes(2);
    const second = vi.mocked(synthesize).mock.calls[1][0];
    expect(second.previous?.draft).toBe(draftV1);
    expect(second.previous?.failed.every((c) => !c.passed)).toBe(true);
    expect(vi.mocked(review).mock.calls.map((c) => c[0].round)).toEqual([1, 2]);

    expect(run).not.toBeNull();
    expect(run!.drafts).toEqual([draftV1, draftV2]);
    expect(run!.reviews).toEqual([failedReview, okReview]);
    expect(run!.teamName).toBe("Демо");
    expect(run!.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(saveRun).toHaveBeenCalledWith(run);
    expect(events.at(-1)).toEqual({ type: "done", runId: run!.id });
    expect(vi.mocked(arbitrate).mock.calls[0][0]).toMatchObject({ draft: draftV2, review: okReview });
  });

  it("stops after the first round when the review passes", async () => {
    vi.mocked(review).mockResolvedValue(okReview);
    const run = await runConsilium({ teamName: "T", scenario }, collect().emit);
    expect(synthesize).toHaveBeenCalledTimes(1);
    expect(run!.drafts).toHaveLength(1);
  });

  it("caps revisions at REVIEW_MAX_ROUNDS and arbitrates the last failed review", async () => {
    vi.mocked(review).mockResolvedValue(failedReview);
    const run = await runConsilium({ teamName: "T", scenario }, collect().emit);
    expect(synthesize).toHaveBeenCalledTimes(2);
    expect(review).toHaveBeenCalledTimes(2);
    expect(run!.reviews).toHaveLength(2);
    expect(vi.mocked(arbitrate).mock.calls[0][0]).toMatchObject({ draft: draftV2, review: failedReview });
  });

  it("returns null on an invalid scenario without calling experts", async () => {
    const { events, emit } = collect();
    const run = await runConsilium({ teamName: "T", scenario: { decisions: scenario.decisions.slice(0, 3) } }, emit);
    expect(run).toBeNull();
    expect(trace(events)).toEqual(["stage:validate:start", "error", "stage:validate:error"]);
    expect(runExperts).not.toHaveBeenCalled();
    expect(saveRun).not.toHaveBeenCalled();
  });

  it("continues with an empty optimizer result when optimize throws", async () => {
    vi.mocked(optimize).mockRejectedValue(new Error("boom"));
    vi.mocked(review).mockResolvedValue(okReview);
    const { events, emit } = collect();
    const run = await runConsilium({ teamName: "T", scenario }, emit);
    expect(events).toContainEqual({ type: "stage", stage: "optimize", status: "error", message: "boom", runId: expect.any(String) });
    expect(run!.optimizer.improvements).toEqual([]);
    expect(run!.optimizer.bestScenario).toBe(scenario);
    expect(run!.optimizer.bestScore).toBe(run!.engine.score);
  });

  it("emits error and does not persist when the synthesizer throws", async () => {
    vi.mocked(synthesize).mockRejectedValue(new Error("llm down"));
    const { events, emit } = collect();
    const run = await runConsilium({ teamName: "T", scenario }, emit);
    expect(run).toBeNull();
    expect(events.slice(-2)).toEqual([
      { type: "error", message: "llm down" },
      { type: "stage", stage: "draft", status: "error", message: "llm down", runId: expect.any(String) },
    ]);
    expect(saveRun).not.toHaveBeenCalled();
    expect(events.some((e) => e.type === "done")).toBe(false);
  });

  it("passes a sandbox dataset through and marks the saved run", async () => {
    vi.mocked(review).mockResolvedValue(okReview);
    const dataset = { ...structuredClone(DEFAULT_DATASET), name: "Песочница" };
    dataset.districts.find((d) => d.id === "nura")!.indicators.S1 = 60;
    const run = await runConsilium({ teamName: "Демо", scenario, dataset }, collect().emit);
    expect(run?.sandbox?.datasetName).toBe("Песочница");
    expect(vi.mocked(optimize).mock.calls[0][1]).toBe(dataset);
    expect(vi.mocked(runExperts).mock.calls[0][0].dataset).toBe(dataset);
    expect(vi.mocked(review).mock.calls[0][0].dataset).toBe(dataset);
  });

  it("does not mark competition runs as sandbox", async () => {
    vi.mocked(review).mockResolvedValue(okReview);
    const run = await runConsilium({ teamName: "Демо", scenario, dataset: DEFAULT_DATASET }, collect().emit);
    expect(run?.sandbox).toBeUndefined();
  });
});
