import { z } from "zod";
import type {
  Draft,
  ExpertOpinion,
  Fact,
  Improvement,
  ReviewCondition,
  Scenario,
} from "@/lib/types";
import type { Dataset } from "@/lib/dataset";
import { fallbackDraft } from "./fallback";
import { callStructured, isLlmEnabled, type LlmUsage } from "./llm";
import {
  SYNTH_PROMPT_VERSION,
  SYNTH_SYSTEM_PROMPT_V1,
  synthUserPrompt,
} from "./prompts";

export interface SynthInput {
  scenario: Scenario;
  facts: Fact[];
  opinions: ExpertOpinion[];
  improvements: Improvement[];
  previous?: { draft: Draft; failed: ReviewCondition[] }; // present on revision rounds
  dataset?: Dataset; // sandbox runs; the case data otherwise
}

// Field order (plan.md §7): lists first, then recommendation, then the free text.
export const synthAnswerSchema = z.object({
  strengths: z.array(z.string().min(1)),
  risks: z.array(z.string().min(1)),
  consequences: z.array(z.string().min(1)),
  recommendationText: z.string().min(1),
  text: z.string().min(1),
});

export async function synthesize(
  input: SynthInput,
  usage: LlmUsage,
): Promise<Draft> {
  const version = input.previous ? input.previous.draft.version + 1 : 1;
  if (!isLlmEnabled()) return fallbackDraft(input, version);

  let answer: z.infer<typeof synthAnswerSchema>;
  try {
    answer = await callStructured(
      {
        role: "synthesizer",
        tier: "judge",
        reasoning: "none",
        system: SYNTH_SYSTEM_PROMPT_V1,
        prompt: synthUserPrompt(input),
        schema: synthAnswerSchema,
        promptVersion: SYNTH_PROMPT_VERSION,
      },
      usage,
    );
  } catch {
    // Emergency path: the failed call is already in usage.traces; the demo must not break on one LLM error.
    return fallbackDraft(input, version);
  }
  const improvement = input.improvements[0];
  return {
    version,
    strengths: answer.strengths,
    risks: answer.risks,
    consequences: answer.consequences,
    recommendation: {
      ...(improvement ? { improvement } : {}),
      text: answer.recommendationText.trim(),
    },
    text: answer.text.trim(),
  };
}
