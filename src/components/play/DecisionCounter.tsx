import { DECISIONS_COUNT } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DecisionCounterProps {
  count: number;
}

export function DecisionCounter({ count }: DecisionCounterProps) {
  const over = count > DECISIONS_COUNT;
  const done = count === DECISIONS_COUNT;
  return (
    <div className="flex items-center justify-between gap-3">
      <p className={cn("text-sm tabular-nums", over && "text-destructive", done && "font-medium")}>
        {count} из {DECISIONS_COUNT} решений
      </p>
      <div className="flex gap-1" aria-hidden>
        {Array.from({ length: Math.max(DECISIONS_COUNT, count) }, (_, i) => (
          <span
            key={i}
            className={cn(
              "size-2.5 rounded-full border border-input",
              i < count && "border-primary bg-primary",
              i >= DECISIONS_COUNT && "border-destructive bg-destructive",
            )}
          />
        ))}
      </div>
    </div>
  );
}
