import type { Fact, Resolution } from "@/lib/types";
import { OutcomeStamp } from "@/components/result/OutcomeStamp";
import { OUTCOME_LABELS, OUTCOME_TONE } from "@/lib/ui/labels";
import { cn } from "@/lib/utils";
import { DisputeItem } from "./DisputeItem";
import { MandateItem } from "./MandateItem";

interface ArbiterResolutionProps {
  resolution: Resolution;
  runId: string;
  facts: Fact[]; // for fact chip tooltips in disputes
}

const DOC_HEADING = "mb-3 font-display text-base font-semibold";

export function ArbiterResolution({ resolution, runId, facts }: ArbiterResolutionProps) {
  const { outcome, disputes, mandates, justification, caveat } = resolution;
  return (
    <article className="relative space-y-8 rounded-xl bg-card p-8 ring-1 ring-foreground/10 md:p-12">
      <OutcomeStamp outcome={outcome} className="absolute top-6 right-6 md:top-10 md:right-10" />
      <header className="pr-36">
        <h4 className="font-display text-2xl font-semibold">Резолюция</h4>
        <p className="mt-1 text-sm text-muted-foreground">
          Акимат города Астаны · прогон <span className="font-mono">{runId}</span>
        </p>
      </header>
      <section className="pr-36">
        <h5 className={DOC_HEADING}>Постановляю</h5>
        <p className={cn("text-lg font-semibold", OUTCOME_TONE[outcome].text)}>{OUTCOME_LABELS[outcome]}</p>
        <p className="mt-2 max-w-[70ch] leading-relaxed">{justification}</p>
      </section>
      {disputes.length > 0 && (
        <section>
          <h5 className={DOC_HEADING}>Споры</h5>
          <ul className="space-y-5">
            {disputes.map((d, i) => (
              <DisputeItem key={i} dispute={d} facts={facts} />
            ))}
          </ul>
        </section>
      )}
      {mandates.length > 0 && (
        <section>
          <h5 className={DOC_HEADING}>Поручения</h5>
          <ol className="list-decimal space-y-5 pl-5 marker:text-muted-foreground marker:tabular-nums">
            {mandates.map((m, i) => (
              <MandateItem key={i} mandate={m} index={i} runId={runId} />
            ))}
          </ol>
        </section>
      )}
      {caveat && (
        <p className="border-t border-border pt-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Оговорка.</span> {caveat}
        </p>
      )}
    </article>
  );
}
