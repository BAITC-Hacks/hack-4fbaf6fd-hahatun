import type { Run } from "@/lib/types";
import { formatScore } from "@/lib/ui/format";
import { Card } from "@/components/ui/card";
import { DeltaValue } from "@/components/result/DeltaValue";
import { OutcomeStamp } from "@/components/result/OutcomeStamp";
import { VerdictStats } from "@/components/result/VerdictStats";

// Verdict summary: big Score with delta, secondary stats and the outcome stamp.
export function VerdictHeader({ run }: { run: Run }) {
  const { engine } = run;
  return (
    <Card className="gap-6 px-6 py-6">
      <div className="flex items-start gap-8">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Astana Quality of Life Score</p>
          <p className="font-display text-6xl font-semibold tracking-tight tabular-nums">
            {formatScore(engine.score)}
          </p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <DeltaValue value={engine.delta} className="text-base font-medium" iconClassName="size-4" />
            <span>
              к базе <span className="tabular-nums">{formatScore(engine.baseScore)}</span>
            </span>
          </p>
        </div>
        <VerdictStats run={run} />
        <OutcomeStamp outcome={run.resolution.outcome} />
      </div>
      {!run.llmEnabled && (
        <p className="border-t border-border pt-4 text-xs text-muted-foreground">
          Ключ OpenAI не задан: тексты консилиума взяты из заготовки
        </p>
      )}
    </Card>
  );
}
