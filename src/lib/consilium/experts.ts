import type { ExpertOpinion, Fact, Improvement, Scenario } from "@/lib/types";
import type { LlmUsage } from "./llm";

export interface ExpertsInput { scenario: Scenario; facts: Fact[]; improvements: Improvement[] }

// Runs 6 experts in parallel; emits each opinion as soon as it arrives. Implemented by the experts agent.
export async function runExperts(
  input: ExpertsInput,
  usage: LlmUsage,
  onOpinion: (o: ExpertOpinion) => void,
): Promise<ExpertOpinion[]> {
  throw new Error(`not implemented: runExperts(${input.facts.length}) ${usage.traces.length} ${typeof onOpinion}`);
}
