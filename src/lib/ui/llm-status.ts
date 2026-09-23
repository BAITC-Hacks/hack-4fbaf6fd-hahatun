import type { Run } from "@/lib/types";

export type LlmStatus = "live" | "partial" | "failed" | "off";

// "failed": every call threw (401, no access) and all texts are fallbacks.
// "partial": some calls threw (429, timeout) and part of the texts are fallbacks.
export function llmStatus(run: Pick<Run, "llmEnabled" | "usage">): LlmStatus {
  if (!run.llmEnabled) return "off";
  const { calls, tokens, failedCalls } = run.usage;
  if (calls > 0 && (failedCalls === calls || (failedCalls === undefined && tokens === 0))) return "failed";
  if ((failedCalls ?? 0) > 0) return "partial";
  return "live";
}

export const LLM_NOTE: Record<Exclude<LlmStatus, "live">, string> = {
  off: "Ключ OpenAI не задан: тексты консилиума взяты из заготовки",
  partial: "Часть вызовов модели не ответила: эти тексты заменены заготовкой, остальные от модели",
  failed: "Модель не ответила (ключ OpenAI не принят или нет доступа): тексты консилиума взяты из заготовки",
};
