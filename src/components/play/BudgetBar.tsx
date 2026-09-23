import { BUDGET } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BudgetBarProps {
  cost: number;
}

export function BudgetBar({ cost }: BudgetBarProps) {
  const over = cost > BUDGET;
  const width = Math.min(cost / BUDGET, 1) * 100;
  return (
    <div className="flex flex-col gap-2">
      <p className={cn("flex justify-between gap-2 text-sm tabular-nums", over && "font-medium text-destructive")}>
        <span>
          {cost} из {BUDGET} у.е.
        </span>
        {over && <span>перерасход на {cost - BUDGET}</span>}
      </p>
      <div
        role="meter"
        aria-label="Израсходовано бюджета"
        aria-valuemin={0}
        aria-valuemax={BUDGET}
        aria-valuenow={Math.min(cost, BUDGET)}
        aria-valuetext={`${cost} из ${BUDGET} у.е.`}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] motion-reduce:transition-none",
            over ? "bg-destructive" : "bg-sky",
          )}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
