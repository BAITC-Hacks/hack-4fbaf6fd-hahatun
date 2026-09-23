import type { Run } from "@/lib/types";
import { roundSummary } from "@/components/consilium/conditions";
import { Card } from "@/components/ui/card";
import { DeltaValue } from "@/components/result/DeltaValue";
import { OutcomeStamp } from "@/components/result/OutcomeStamp";
import { formatPercent, formatScore } from "@/lib/ui/format";
import { LLM_NOTE, llmStatus } from "@/lib/ui/llm-status";
import { verdictSentence } from "@/lib/ui/verdict";

// The answer first: Score with its change, one plain sentence built by code, the stamp.
export function VerdictSummary({ run }: { run: Run }) {
  const { engine } = run;
  const status = llmStatus(run);
  const review = run.reviews.at(-1);
  return (
    <Card className="items-start justify-between gap-6 px-6 py-7 text-base sm:flex-row sm:gap-8 md:px-8">
      <div className="flex max-w-[62ch] flex-col gap-4">
        <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="font-display text-6xl leading-none font-semibold tracking-tight tabular-nums">
            {formatScore(engine.score)}
          </span>
          <DeltaValue value={engine.delta} className="text-lg font-medium" iconClassName="size-4" />
          <span className="text-sm text-muted-foreground">
            Astana Quality of Life Score, база <span className="tabular-nums">{formatScore(engine.baseScore)}</span>
          </span>
        </p>
        <p className="text-lg leading-snug text-pretty">{verdictSentence(engine, run.resolution.outcome)}</p>
        <p className="text-sm text-muted-foreground">
          Лучше <span className="tabular-nums">{formatPercent(run.optimizer.percentile)}</span> допустимых наборов
          {review && <> · ревизия <span className="tabular-nums">{roundSummary(review).text}</span></>}
        </p>
        {status !== "live" && <p className="text-sm text-muted-foreground">{LLM_NOTE[status]}.</p>}
      </div>
      <OutcomeStamp outcome={run.resolution.outcome} className="max-sm:self-end" />
    </Card>
  );
}
