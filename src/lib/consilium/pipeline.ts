import { randomUUID } from "node:crypto";
import { buildFacts, calculate, validate } from "@/lib/engine";
import { optimize } from "@/lib/engine/optimizer";
import { isDefaultDataset, type Dataset } from "@/lib/dataset";
import { saveRun } from "@/lib/store/runs";
import {
  REVIEW_MAX_ROUNDS,
  type ConsiliumEvent,
  type Draft,
  type EngineResult,
  type ExpertOpinion,
  type Fact,
  type Improvement,
  type OptimizerResult,
  type Review,
  type Run,
  type Scenario,
  type Stage,
} from "@/lib/types";
import { arbitrate } from "./arbiter";
import { runExperts } from "./experts";
import { isLlmEnabled, LlmUsage } from "./llm";
import { review } from "./reviewers";
import { synthesize } from "./synthesizer";

export interface ConsiliumInput {
  teamName: string;
  scenario: Scenario;
  dataset?: Dataset; // sandbox dataset; absent = the case data
}

type Emit = (e: ConsiliumEvent) => void;

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

class StageTracker {
  current: Stage = "validate";
  constructor(
    private readonly emit: Emit,
    readonly runId: string,
  ) {}
  start(stage: Stage, message?: string) {
    this.current = stage;
    this.emit({ type: "stage", stage, status: "start", runId: this.runId, ...(message ? { message } : {}) });
  }
  done(message?: string) {
    this.emit({ type: "stage", stage: this.current, status: "done", runId: this.runId, ...(message ? { message } : {}) });
  }
  error(message: string) {
    this.emit({ type: "stage", stage: this.current, status: "error", runId: this.runId, message });
  }
}

async function safeOptimize(
  scenario: Scenario,
  engine: EngineResult,
  stages: StageTracker,
  dataset?: Dataset,
): Promise<OptimizerResult> {
  stages.start("optimize");
  try {
    const result = await optimize(scenario, dataset);
    stages.done();
    return result;
  } catch (err) {
    stages.error(errorMessage(err));
    return { bestScore: engine.score, bestScenario: scenario, percentile: 0, improvements: [] };
  }
}

interface RevisionContext {
  scenario: Scenario;
  facts: Fact[];
  opinions: ExpertOpinion[];
  improvements: Improvement[];
  userScore: number;
  dataset?: Dataset;
}

async function reviseLoop(ctx: RevisionContext, usage: LlmUsage, emit: Emit, stages: StageTracker) {
  const drafts: Draft[] = [];
  const reviews: Review[] = [];
  let previous: { draft: Draft; failed: Review["conditions"] } | undefined;
  for (let round = 1; round <= REVIEW_MAX_ROUNDS; round++) {
    const label = `круг ${round}`;
    stages.start("draft", label);
    const { scenario, facts, opinions, improvements, dataset } = ctx;
    const draft = await synthesize({ scenario, facts, opinions, improvements, previous, dataset }, usage);
    drafts.push(draft);
    emit({ type: "draft", draft });
    stages.done(label);

    stages.start("review", label);
    const result = await review({ draft, facts, userScore: ctx.userScore, round, dataset }, usage);
    reviews.push(result);
    emit({ type: "review", review: result });
    stages.done(label);

    if (result.ok) break;
    previous = { draft, failed: result.conditions.filter((c) => !c.passed) };
  }
  return { drafts, reviews };
}

// Runs the whole consilium, streaming events. Returns the saved Run, or null on any failure (nothing is saved then).
export async function runConsilium(input: ConsiliumInput, emit: Emit): Promise<Run | null> {
  const { teamName, scenario, dataset } = input;
  const runId = randomUUID();
  const stages = new StageTracker(emit, runId);

  stages.start("validate");
  const validation = validate(scenario, dataset);
  if (!validation.ok) {
    const message = validation.errors.map((e) => e.message).join("; ");
    emit({ type: "error", message });
    stages.error(message);
    return null;
  }
  stages.done();

  try {
    return await runStages({ teamName, scenario, dataset }, emit, stages);
  } catch (err) {
    const message = errorMessage(err);
    emit({ type: "error", message });
    stages.error(message);
    return null;
  }
}

async function runStages(input: ConsiliumInput, emit: Emit, stages: StageTracker): Promise<Run> {
  const { teamName, scenario, dataset } = input;
  const usage = new LlmUsage();
  const startedAt = Date.now();

  stages.start("engine");
  const engine = calculate(scenario, [], dataset);
  stages.done();
  const optimizer = await safeOptimize(scenario, engine, stages, dataset);
  const { improvements } = optimizer;
  const facts = buildFacts(scenario, engine, optimizer, dataset);
  emit({ type: "engine", result: engine, facts });
  emit({ type: "optimizer", result: optimizer });

  stages.start("experts");
  const opinions = await runExperts({ scenario, facts, improvements, dataset }, usage, (opinion) =>
    emit({ type: "expert", opinion }),
  );
  stages.done();

  const ctx: RevisionContext = { scenario, facts, opinions, improvements, userScore: engine.score, dataset };
  const { drafts, reviews } = await reviseLoop(ctx, usage, emit, stages);
  const draft = drafts[drafts.length - 1];
  const lastReview = reviews[reviews.length - 1];

  stages.start("arbiter");
  const resolution = await arbitrate({ engine, facts, opinions, draft, review: lastReview, improvements }, usage);
  emit({ type: "resolution", resolution });
  stages.done();

  stages.start("persist");
  const run: Run = {
    id: stages.runId,
    teamName,
    createdAt: new Date().toISOString(),
    scenario,
    engine,
    facts,
    optimizer,
    opinions,
    drafts,
    reviews,
    resolution,
    llmEnabled: isLlmEnabled(),
    // wall-clock of the whole run, not the sum of LLM calls (which is 0 in fallback mode)
    usage: { ...usage.summary(), durationMs: Date.now() - startedAt },
    ...(dataset && !isDefaultDataset(dataset) ? { sandbox: { datasetName: dataset.name, dataset } } : {}),
  };
  await saveRun(run);
  stages.done();
  emit({ type: "done", runId: run.id });
  return run;
}
