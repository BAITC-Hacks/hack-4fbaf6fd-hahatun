import type { Draft, Fact, Review } from "@/lib/types";
import type { LlmUsage } from "./llm";

export interface ReviewInput { draft: Draft; facts: Fact[]; userScore: number; round: number }

// C1 and C2 by code, C3-C6 by one LLM call. Implemented by the reviewers agent.
export async function review(input: ReviewInput, usage: LlmUsage): Promise<Review> {
  throw new Error(`not implemented: review(${input.round}) ${usage.traces.length}`);
}
