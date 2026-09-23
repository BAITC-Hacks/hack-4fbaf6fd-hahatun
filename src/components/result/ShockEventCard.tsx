import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import type { Run } from "@/lib/types";
import { DISTRICT_LABELS, INDICATOR_LABELS } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { Disclosure } from "@/components/result/Disclosure";
import { buildEvent } from "@/lib/engine/events";
import { formatDelta, formatScore } from "@/lib/ui/format";
import { encodeDecisions } from "@/lib/ui/scenario";

// Sudden city event (A14) as one compact notice row; the story and the best swap sit behind «Подробнее».
export function ShockEventCard({ run }: { run: Run }) {
  const event = buildEvent(run);
  const { shock, suggestion } = event;
  return (
    <section
      aria-labelledby="shock-title"
      className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2"
    >
      <TriangleAlert className="size-4 shrink-0 text-destructive" aria-hidden />
      <h2 id="shock-title" className="font-medium">
        Внезапное событие: {event.title}
      </h2>
      <p className="text-sm text-muted-foreground tabular-nums">
        {DISTRICT_LABELS[shock.districtId]}, {INDICATOR_LABELS[shock.indicator].toLowerCase()}{" "}
        <span className="text-destructive">{formatDelta(shock.delta)}</span> · Score {formatScore(event.scoreBefore)} →{" "}
        {formatScore(event.scoreAfter)}
      </p>
      <Link
        href={`/play?s=${encodeDecisions(run.scenario.decisions)}`}
        className={buttonVariants({ variant: "outline", size: "sm", className: "ml-auto" })}
      >
        Перераспределить бюджет
      </Link>
      <Disclosure title="Подробнее" className="basis-full">
        <div className="flex max-w-[65ch] flex-col gap-2 text-sm">
          <p>{event.text}</p>
          <p className="text-muted-foreground tabular-nums">
            Критических значений после события: {event.nCritAfter}.
          </p>
          {suggestion && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-2 tabular-nums">
              Лучшая замена под событием: {suggestion.change}, Score {formatScore(suggestion.score)}
              <Link
                href={`/play?s=${encodeDecisions(suggestion.scenario.decisions)}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Открыть с заменой
              </Link>
            </p>
          )}
        </div>
      </Disclosure>
    </section>
  );
}
