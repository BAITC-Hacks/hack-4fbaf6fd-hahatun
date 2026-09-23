import { Check, X } from "lucide-react";
import type { ReviewCondition } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CONDITION_LABELS, REVIEWER_LABELS } from "./conditions";
import { stripQuoteMarks } from "./highlight";

export function ConditionRow({ condition }: { condition: ReviewCondition }) {
  const reviewer = REVIEWER_LABELS[condition.by];
  return (
    <li className="grid grid-cols-[1rem_1.75rem_minmax(0,1fr)_auto] gap-x-3 border-t border-border py-2.5 first:border-t-0">
      {condition.passed ? (
        <Check className="mt-0.5 size-4 text-outcome-approve" aria-hidden />
      ) : (
        <X className="mt-0.5 size-4 text-destructive" aria-hidden />
      )}
      <span className="font-mono text-xs leading-5 font-semibold">
        {condition.id}
        <span className="sr-only">{condition.passed ? " выполнено" : " не выполнено"}</span>
      </span>
      <div className="space-y-0.5">
        <p className="text-sm">{CONDITION_LABELS[condition.id]}</p>
        <p className={cn("text-xs", condition.passed ? "text-muted-foreground" : "text-destructive")}>
          {condition.reason}
        </p>
        {condition.quote && (
          <p className="text-xs text-muted-foreground italic">«{stripQuoteMarks(condition.quote)}»</p>
        )}
      </div>
      <span className={cn("text-xs leading-5 font-medium", reviewer.className)}>{reviewer.label}</span>
    </li>
  );
}
