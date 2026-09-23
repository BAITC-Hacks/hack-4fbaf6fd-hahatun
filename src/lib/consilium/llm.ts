import "server-only";
import { createHash } from "node:crypto";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import type { z } from "zod";
import type { RunUsage } from "@/lib/types";

// Single entry point for every LLM call. Handles: disabled mode (no key), retries (AI SDK backoff on 429),
// prompt fingerprints, token/cost accounting. Nothing outside this file imports "ai" or "@ai-sdk/openai".

export type LlmTier = "expert" | "judge";

export interface LlmCall<T> {
  role: string; // for tracing: "expert:transport", "synthesizer", "reviewers", "arbiter"
  tier: LlmTier;
  system: string;
  prompt: string;
  schema: z.ZodType<T>;
  promptVersion: string; // e.g. "expert-v1"
  reasoning?: "none" | "low" | "medium";
}

export interface LlmTrace {
  role: string;
  model: string;
  fingerprint: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  ok: boolean;
  error?: string;
}

export class LlmUsage {
  traces: LlmTrace[] = [];
  add(t: LlmTrace) {
    this.traces.push(t);
  }
  summary(): RunUsage {
    const tokens = this.traces.reduce((s, t) => s + t.inputTokens + t.outputTokens, 0);
    const costUsd = this.traces.reduce((s, t) => s + estimateCost(t), 0);
    const durationMs = this.traces.reduce((s, t) => s + t.durationMs, 0);
    const failedCalls = this.traces.filter((t) => !t.ok).length;
    return { calls: this.traces.length, tokens, costUsd: round4(costUsd), durationMs, failedCalls };
  }
}

const PRICE_PER_M: Record<LlmTier, { input: number; output: number }> = {
  expert: { input: 0.25, output: 2 }, // gpt-5-mini class, indicative
  judge: { input: 1.25, output: 10 }, // gpt-5 class, indicative
};

function estimateCost(t: LlmTrace): number {
  const tier: LlmTier = t.model === modelFor("judge") ? "judge" : "expert";
  return (t.inputTokens * PRICE_PER_M[tier].input + t.outputTokens * PRICE_PER_M[tier].output) / 1_000_000;
}

const round4 = (x: number) => Math.round(x * 10_000) / 10_000;

export function isLlmEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());
}

export function modelFor(tier: LlmTier): string {
  if (tier === "expert") return process.env.OPENAI_EXPERT_MODEL?.trim() || "gpt-5-mini";
  return process.env.OPENAI_JUDGE_MODEL?.trim() || "gpt-5";
}

export function promptFingerprint(version: string, system: string): string {
  return `${version}@${createHash("sha256").update(system).digest("hex").slice(0, 8)}`;
}

export function knowledgeContext(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `Сегодня ${today}. Ты работаешь внутри симулятора с синтетическими данными: единственный источник чисел — переданные факты с ID. Ничего не считай сам и не придумывай показатели, которых нет в фактах.`;
}

let provider: ReturnType<typeof createOpenAI> | null = null;
function getProvider() {
  if (!provider) provider = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return provider;
}

// Throws if LLM is disabled: callers must check isLlmEnabled() and use fixtures instead.
export async function callStructured<T>(call: LlmCall<T>, usage: LlmUsage): Promise<T> {
  if (!isLlmEnabled()) throw new Error("LLM disabled: OPENAI_API_KEY is empty");
  const model = modelFor(call.tier);
  const system = `${call.system}\n\n${knowledgeContext()}`;
  const started = Date.now();
  const fingerprint = promptFingerprint(call.promptVersion, system);
  try {
    const result = await generateObject({
      model: getProvider()(model),
      schema: call.schema,
      system,
      prompt: call.prompt,
      maxRetries: 3,
      providerOptions: { openai: { reasoningEffort: call.reasoning ?? (call.tier === "expert" ? "none" : "low") } },
    });
    usage.add({
      role: call.role,
      model,
      fingerprint,
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
      durationMs: Date.now() - started,
      ok: true,
    });
    return result.object as T;
  } catch (err) {
    usage.add({
      role: call.role,
      model,
      fingerprint,
      inputTokens: 0,
      outputTokens: 0,
      durationMs: Date.now() - started,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
