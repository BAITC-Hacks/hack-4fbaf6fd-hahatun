import { ChevronRight } from "lucide-react";
import type { ExpertOpinion } from "@/lib/types";
import { DISTRICT_LABELS } from "@/lib/types";
import { MEASURE_SHORT } from "@/lib/ui/labels";

// Risk, tradeoff and suggested measure, collapsed by default.
export function ExpertDetails({ opinion }: { opinion: ExpertOpinion }) {
  const { suggestion } = opinion;
  return (
    <details className="group text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-3.5 transition-transform group-open:rotate-90 motion-reduce:transition-none" />
        Риск и компромисс
      </summary>
      <dl className="mt-2 space-y-2 border-l border-border pl-3">
        <div>
          <dt className="text-xs text-muted-foreground">Риск</dt>
          <dd>{opinion.risk}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Компромисс</dt>
          <dd>{opinion.tradeoff}</dd>
        </div>
        {suggestion && (
          <div>
            <dt className="text-xs text-muted-foreground">Предлагает</dt>
            <dd>
              <span className="first-letter:uppercase">{MEASURE_SHORT[suggestion.measureId]}</span>
              {suggestion.districtId && ` · ${DISTRICT_LABELS[suggestion.districtId]}`}
            </dd>
          </div>
        )}
      </dl>
    </details>
  );
}
