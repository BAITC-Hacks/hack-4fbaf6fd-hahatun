import { BUDGET } from "@/lib/types";
import { formatCost } from "@/lib/ui/format";
import { cn } from "@/lib/utils";

interface BudgetBarProps {
  cost: number;
}

export function BudgetBar({ cost }: BudgetBarProps) {
  const over = cost > BUDGET;
  const width = Math.min(cost / BUDGET, 1) * 100;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs text-muted-foreground">Бюджет</p>
        <p className={cn("text-sm font-medium tabular-nums", over && "text-destructive")}>
          {cost} / {formatCost(BUDGET)}
        </p>
      </div>
      <div
        role="meter"
        aria-label="Израсходовано бюджета"
        aria-valuemin={0}
        aria-valuemax={BUDGET}
        aria-valuenow={Math.min(cost, BUDGET)}
        aria-valuetext={`${cost} из ${BUDGET} у.е.`}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn("h-full rounded-full transition-[width]", over ? "bg-destructive" : "bg-sky")}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className={cn("text-xs tabular-nums", over ? "text-destructive" : "text-muted-foreground")}>
        {over ? `перерасход на ${formatCost(cost - BUDGET)}` : `остаток ${BUDGET - cost}`}
      </p>
    </div>
  );
}
