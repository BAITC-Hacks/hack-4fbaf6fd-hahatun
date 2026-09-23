import type { Review } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ConditionRow } from "./ConditionRow";
import { roundSummary } from "./conditions";

export function ReviewRound({ review }: { review: Review }) {
  const summary = roundSummary(review);
  const conditions = [...review.conditions].sort((a, b) => a.id.localeCompare(b.id));
  return (
    <article className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <header className="mb-1 flex items-baseline justify-between gap-3">
        <h4 className="font-medium">Круг {review.round}</h4>
        <p
          className={cn(
            "text-sm font-medium tabular-nums",
            summary.passed ? "text-outcome-approve" : "text-destructive",
          )}
        >
          {summary.text}
        </p>
      </header>
      <ul>
        {conditions.map((c) => (
          <ConditionRow key={c.id} condition={c} />
        ))}
      </ul>
    </article>
  );
}
