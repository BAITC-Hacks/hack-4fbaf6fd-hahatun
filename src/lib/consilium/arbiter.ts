import type { Draft, EngineResult, ExpertOpinion, Fact, Improvement, Outcome, Resolution, Review } from "@/lib/types";
import type { LlmUsage } from "./llm";

export interface ArbiterInput {
  engine: EngineResult; facts: Fact[]; opinions: ExpertOpinion[]; draft: Draft; review: Review; improvements: Improvement[];
}

// Outcome is decided by code (plan.md §7 table); LLM writes disputes/justification/mandates.
export function decideOutcome(engine: EngineResult, review: Review): Outcome {
  throw new Error(`not implemented: decideOutcome ${engine.score} ${review.ok}`);
}

export async function arbitrate(input: ArbiterInput, usage: LlmUsage): Promise<Resolution> {
  throw new Error(`not implemented: arbitrate(${input.facts.length}) ${usage.traces.length}`);
}
