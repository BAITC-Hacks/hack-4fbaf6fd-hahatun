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
      <p className="text-xs text-muted-foreground">Score набора</p>
      <div className="flex items-baseline gap-3">
        <p className="font-display text-4xl leading-none font-semibold tabular-nums">
          {score === null ? "—" : formatScore(score)}
        </p>
        {delta !== null && (
          <p className={cn("text-sm font-medium tabular-nums", TREND_TONE[trendOf(delta)])}>{formatDelta(delta)}</p>
        )}
      </div>
      <p className="text-xs text-muted-foreground tabular-nums">
        {score === null ? "соберите допустимый набор" : `база ${formatScore(baseScore)}`}
      </p>
    </div>
  );
}
