import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import type { Run } from "@/lib/types";
import { DISTRICT_LABELS, INDICATOR_LABELS } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { buildEvent } from "@/lib/engine/events";
import { formatDelta, formatScore } from "@/lib/ui/format";
import { encodeDecisions } from "@/lib/ui/scenario";

// Sudden city event on top of the finished run (A14): what hit where, what it costs, and a way back to the cabinet.
export function ShockEventCard({ run }: { run: Run }) {
  const event = buildEvent(run);
  const { shock, suggestion } = event;
  const lost = event.scoreAfter - event.scoreBefore;
  return (
    <section
      aria-labelledby="shock-title"
      className="flex flex-col gap-4 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-5 md:flex-row md:items-end md:justify-between"
    >
      <div className="space-y-2">
        <h2 id="shock-title" className="flex items-center gap-2 font-display text-lg font-semibold text-balance">
          <TriangleAlert className="size-5 shrink-0 text-destructive" aria-hidden />
          Внезапное событие: {event.title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {DISTRICT_LABELS[shock.districtId]} · <span className="font-mono">{shock.indicator}</span>{" "}
          {INDICATOR_LABELS[shock.indicator]} · удар{" "}
          <span className="font-medium text-destructive tabular-nums">{formatDelta(shock.delta)}</span>
        </p>
        <p className="max-w-[65ch]">{event.text}</p>
        <p className="text-sm tabular-nums">
          Score с тем же набором: {formatScore(event.scoreBefore)} → {formatScore(event.scoreAfter)}{" "}
          <span className="text-destructive">({formatDelta(lost)})</span>, критических значений: {event.nCritAfter}
        </p>
        {suggestion && (
          <p className="text-sm text-muted-foreground">
            Лучшая замена под событием: {suggestion.change}, Score {formatScore(suggestion.score)}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-2 md:items-end">
        <Link href={`/play?s=${encodeDecisions(run.scenario.decisions)}`} className={buttonVariants()}>
          Перераспределить бюджет
        </Link>
        {suggestion && (
          <Link
            href={`/play?s=${encodeDecisions(suggestion.scenario.decisions)}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Открыть с заменой
          </Link>
        )}
      </div>
    </section>
  );
}
