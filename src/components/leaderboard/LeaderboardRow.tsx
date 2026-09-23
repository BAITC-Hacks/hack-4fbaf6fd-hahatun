import Link from "next/link";
import { DISTRICT_LABELS } from "@/lib/types";
import { formatPercent, formatScore } from "@/lib/ui/format";
import { OUTCOME_LABELS, OUTCOME_TONE } from "@/lib/ui/labels";
import type { RunSummary } from "@/lib/ui/run-source";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DeltaValue } from "@/components/result/DeltaValue";
import { cn } from "@/lib/utils";

const TIME_FORMAT = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Almaty",
});

function rankTone(rank: number): string {
  if (rank === 1) return "text-gold font-semibold";
  if (rank <= 3) return "text-foreground font-medium";
  return "text-muted-foreground";
}

export function LeaderboardRow({ run, rank }: { run: RunSummary; rank: number }) {
  const tone = OUTCOME_TONE[run.outcome];
  return (
    <tr className="border-t border-border">
      <td className={cn("px-3 py-3 font-mono tabular-nums", rankTone(rank))}>{rank}</td>
      <td className="min-w-40 px-3 py-3 font-medium">
        <span className="flex items-center gap-2">
          <span className="break-words" title={run.teamName}>
            {run.teamName}
          </span>
          {run.isSample && (
            <Badge variant="outline" className="text-muted-foreground">
              пример
            </Badge>
          )}
        </span>
      </td>
      <td className="px-3 py-3 text-right font-display text-base font-semibold tabular-nums">
        {formatScore(run.score)}
      </td>
      <td className="px-3 py-3 text-right">
        <DeltaValue value={run.delta} />
      </td>
      <td className="px-3 py-3">
        <span className={cn("inline-flex items-center gap-2 whitespace-nowrap", tone.text)}>
          <span aria-hidden className={cn("size-2 rounded-full", tone.bg)} />
          {OUTCOME_LABELS[run.outcome]}
        </span>
      </td>
      <td className="px-3 py-3 text-right tabular-nums">{formatPercent(run.percentile)}</td>
      <td className="px-3 py-3">{DISTRICT_LABELS[run.weakestDistrict]}</td>
      <td className="px-3 py-3 text-right font-mono tabular-nums">{run.reviewPassed}/6</td>
      <td className="px-3 py-3 text-right font-mono text-muted-foreground tabular-nums">
        <time dateTime={run.createdAt}>{TIME_FORMAT.format(new Date(run.createdAt))}</time>
      </td>
      <td className="px-3 py-3 text-right">
        <Link href={`/result/${run.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Открыть
        </Link>
      </td>
    </tr>
  );
}
