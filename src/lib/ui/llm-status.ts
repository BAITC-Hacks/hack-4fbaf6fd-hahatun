import type { Run } from "@/lib/types";

export type LlmStatus = "live" | "off" | "failed";

// "failed": a key was set, calls were made, but no tokens came back (e.g. 401), so the pipeline used fallback texts.
export function llmStatus(run: Pick<Run, "llmEnabled" | "usage">): LlmStatus {
  if (!run.llmEnabled) return "off";
  return run.usage.calls > 0 && run.usage.tokens === 0 ? "failed" : "live";
}

export const LLM_NOTE: Record<Exclude<LlmStatus, "live">, string> = {
  off: "Ключ OpenAI не задан: тексты консилиума взяты из заготовки",
  failed: "Модель не ответила (ключ OpenAI не принят или нет доступа): тексты консилиума взяты из заготовки",
};
