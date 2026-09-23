import { formatDelta, formatScore, trendOf } from "@/lib/ui/format";
import { cn } from "@/lib/utils";

interface LiveScoreProps {
  score: number | null; // null while the set is invalid
  baseScore: number;
}

const TREND_TONE = { up: "text-outcome-approve", down: "text-destructive", flat: "text-muted-foreground" } as const;

export function LiveScore({ score, baseScore }: LiveScoreProps) {
  const delta = score === null ? null : score - baseScore;
  return (
    <div className="flex flex-col gap-1" aria-live="polite">
      <div className="flex items-baseline gap-3">
        <p className="text-sm text-muted-foreground">Score</p>
        <p className="font-display text-4xl leading-none font-semibold tabular-nums">
          {score === null ? "—" : formatScore(score)}
        </p>
        {delta !== null && (
          <p
            title={`База ${formatScore(baseScore)}`}
            className={cn("text-sm font-medium tabular-nums", TREND_TONE[trendOf(delta)])}
          >
            {formatDelta(delta)}
          </p>
        )}
      </div>
      {score === null && <p className="text-sm text-muted-foreground">появится, когда набор пройдёт проверку</p>}
    </div>
  );
}
