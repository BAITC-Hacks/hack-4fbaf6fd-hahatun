import { llmStatus } from "@/lib/ui/llm-status";
import type { Run } from "@/lib/types";

const INT = new Intl.NumberFormat("ru-RU");
const SECONDS = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });

function formatUsd(n: number): string {
  return n === 0 ? "$0" : `$${n.toFixed(3)}`;
}

function formatSeconds(ms: number): string {
  const s = ms / 1000;
  return `${s < 10 ? SECONDS.format(s) : INT.format(Math.round(s))} с`;
}

// Quiet LLM spend line under the resolution, straight from run.usage.
export function UsagePanel({ run }: { run: Run }) {
  const { calls, tokens, costUsd, durationMs } = run.usage;
  return (
    <p className="text-xs text-muted-foreground">
      Вызовов LLM: <span className="tabular-nums">{INT.format(calls)}</span> · токенов:{" "}
      <span className="tabular-nums">{INT.format(tokens)}</span> · стоимость:{" "}
      <span className="tabular-nums">{formatUsd(costUsd)}</span> · длительность:{" "}
      <span className="tabular-nums">{formatSeconds(durationMs)}</span>
      {!run.llmEnabled && " (без ключа OpenAI, вызовы не тратились)"}
      {llmStatus(run) === "failed" && " (модель не ответила, токены не потрачены)"}
    </p>
  );
}
