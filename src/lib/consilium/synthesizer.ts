import type { Draft, ExpertOpinion, Fact, Improvement, ReviewCondition, Scenario } from "@/lib/types";
import type { LlmUsage } from "./llm";

export interface SynthInput {
  scenario: Scenario; facts: Fact[]; opinions: ExpertOpinion[]; improvements: Improvement[];
  previous?: { draft: Draft; failed: ReviewCondition[] }; // present on revision rounds
}

export async function synthesize(input: SynthInput, usage: LlmUsage): Promise<Draft> {
  throw new Error(`not implemented: synthesize(${input.opinions.length}) ${usage.traces.length}`);
}
