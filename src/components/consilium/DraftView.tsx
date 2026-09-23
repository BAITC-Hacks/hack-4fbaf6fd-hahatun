import type { Draft, Review } from "@/lib/types";
import { formatDelta, formatScore } from "@/lib/ui/format";
import { cn } from "@/lib/utils";
import { roundSummary } from "./conditions";
import { DraftList } from "./DraftList";
import { DraftText } from "./DraftText";

interface DraftViewProps {
  draft: Draft;
  review?: Review; // absent while the reviewers are still working
}

export function DraftView({ draft, review }: DraftViewProps) {
  const summary = review && roundSummary(review);
  const failed = review?.conditions.filter((c) => !c.passed) ?? [];
  const { improvement, text } = draft.recommendation;
  const tone = !summary ? "text-muted-foreground" : summary.passed ? "text-outcome-approve" : "text-destructive";
  return (
    <article className="space-y-6 rounded-xl bg-card p-6 ring-1 ring-foreground/10">
      <header className="flex items-baseline justify-between gap-3">
        <h4 className="font-medium">Черновик {draft.version}</h4>
        <p className={cn("text-sm tabular-nums", tone)}>
          {summary ? `Ревизия: ${summary.text}` : "На ревизии…"}
        </p>
      </header>
      <DraftText text={draft.text} failed={failed} />
      <div className="grid gap-6 border-t border-border pt-5 md:grid-cols-3">
        <DraftList title="Сильные стороны" items={draft.strengths} />
        <DraftList title="Риски" items={draft.risks} />
        <DraftList title="Последствия" items={draft.consequences} />
      </div>
      <div className="border-t border-border pt-5">
        <h5 className="mb-1.5 text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
          Рекомендация
        </h5>
        <p className="text-sm">{text}</p>
        {improvement && (
          <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
            <span className="font-mono">{improvement.change}</span> · Score {formatScore(improvement.score)}{" "}
            <span className="text-outcome-approve">{formatDelta(improvement.delta)}</span>
          </p>
        )}
      </div>
    </article>
  );
}
