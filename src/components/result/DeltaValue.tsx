import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { formatDelta, trendOf, type Trend } from "@/lib/ui/format";
import { cn } from "@/lib/utils";

const TREND_ICON: Record<Trend, typeof ArrowUp> = { up: ArrowUp, down: ArrowDown, flat: Minus };

const TREND_TONE: Record<Trend, string> = {
  up: "text-outcome-approve",
  down: "text-destructive",
  flat: "text-muted-foreground",
};

interface DeltaValueProps {
  value: number;
  className?: string;
  iconClassName?: string;
}

// Signed change with a trend arrow: green up, red down, muted when flat.
export function DeltaValue({ value, className, iconClassName }: DeltaValueProps) {
  const trend = trendOf(value);
  const Icon = TREND_ICON[trend];
  return (
    <span className={cn("inline-flex items-center gap-1 tabular-nums", TREND_TONE[trend], className)}>
      <Icon aria-hidden className={cn("size-3.5", iconClassName)} />
      {formatDelta(value)}
    </span>
  );
}
