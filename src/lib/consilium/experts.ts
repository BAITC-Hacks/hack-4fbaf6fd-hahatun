import { z } from "zod";
import { MEASURE_BY_ID } from "@/lib/data";
import type { Decision, DistrictId, ExpertOpinion, ExpertRole, Fact, Improvement, MeasureId, Scenario } from "@/lib/types";
import { fallbackOpinion, fallbackOpinions, factsForRole } from "./fallback";
import { callStructured, isLlmEnabled, type LlmUsage } from "./llm";
import { EXPERT_NAMES, EXPERT_PROMPT_VERSION, EXPERT_ROLES, expertSystemPrompt, expertUserPrompt } from "./prompts";

export interface ExpertsInput { scenario: Scenario; facts: Fact[]; improvements: Improvement[] }

const MEASURE_IDS = Object.keys(MEASURE_BY_ID) as [MeasureId, ...MeasureId[]];
const DISTRICT_IDS: [DistrictId, ...DistrictId[]] = ["esil", "almaty", "saryarka", "baikonur", "nura"];

// Field order matters: reasoning (summary/risk/tradeoff/factRefs) before the verdict (stance).
// Nullable instead of optional: OpenAI strict JSON schema requires every property to be present.
export const expertAnswerSchema = z.object({
  summary: z.string().min(1),
  risk: z.string().min(1),
  tradeoff: z.string().min(1),
  factRefs: z.array(z.string()),
  stance: z.enum(["support", "concern"]),
  suggestion: z
    .object({ measureId: z.enum(MEASURE_IDS), districtId: z.enum(DISTRICT_IDS).nullable() })
    .nullable(),
});
export type ExpertAnswer = z.infer<typeof expertAnswerSchema>;

// Drops references to facts the expert was not given, keeps order, removes duplicates.
export function filterFactRefs(refs: string[], allowed: Fact[]): string[] {
  const ids = new Set(allowed.map((f) => f.id));
  return [...new Set(refs.map((r) => r.trim()))].filter((r) => ids.has(r));
}

// Keeps a suggestion only if the measure exists and the district matches its scope.
export function sanitizeSuggestion(s: { measureId: string; districtId?: string | null } | null | undefined): Decision | undefined {
  if (!s) return undefined;
  const m = MEASURE_BY_ID[s.measureId as MeasureId];
  if (!m) return undefined;
  const districtId = s.districtId ?? undefined;
  if (m.scope === "district") {
    if (!districtId || !DISTRICT_IDS.includes(districtId as DistrictId)) return undefined;
    return { measureId: m.id, districtId: districtId as DistrictId };
  }
  return districtId ? undefined : { measureId: m.id };
}

export function toOpinion(role: ExpertRole, answer: ExpertAnswer, allowed: Fact[]): ExpertOpinion {
  const suggestion = sanitizeSuggestion(answer.suggestion);
  return {
    role,
    name: EXPERT_NAMES[role],
    stance: answer.stance,
    summary: answer.summary.trim(),
    risk: answer.risk.trim(),
    tradeoff: answer.tradeoff.trim(),
    factRefs: filterFactRefs(answer.factRefs, allowed),
    ...(suggestion ? { suggestion } : {}),
  };
}

async function askExpert(role: ExpertRole, input: ExpertsInput, usage: LlmUsage): Promise<ExpertOpinion> {
  const facts = factsForRole(role, input.facts);
  try {
    const answer = await callStructured(
      {
        role: `expert:${role}`,
        tier: "expert",
        system: expertSystemPrompt(role),
        prompt: expertUserPrompt(input.scenario, facts, input.improvements),
        schema: expertAnswerSchema,
        promptVersion: EXPERT_PROMPT_VERSION,
      },
      usage,
    );
    return toOpinion(role, answer, facts);
  } catch {
    // The failure is already recorded in usage.traces by callStructured; one expert must not sink the rest.
    return fallbackOpinion(role, input);
  }
}

// Runs 6 experts in parallel; emits each opinion as soon as it arrives, returns them in role order.
export async function runExperts(
  input: ExpertsInput,
  usage: LlmUsage,
  onOpinion: (o: ExpertOpinion) => void,
): Promise<ExpertOpinion[]> {
  if (!isLlmEnabled()) {
    const opinions = fallbackOpinions(input);
    opinions.forEach((o) => onOpinion(o));
    return opinions;
  }
  return Promise.all(
    EXPERT_ROLES.map(async (role) => {
      const opinion = await askExpert(role, input, usage);
      onOpinion(opinion);
      return opinion;
    }),
  );
}
