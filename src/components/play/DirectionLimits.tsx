import { DIRECTION_CAP, DIRECTION_LABELS, type Direction } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DirectionLimitsProps {
  counts: Record<Direction, number>;
}

const DIRECTIONS = Object.keys(DIRECTION_LABELS) as Direction[];

export function DirectionLimits({ counts }: DirectionLimitsProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-muted-foreground">Не больше {DIRECTION_CAP} на направление</p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
        {DIRECTIONS.map((dir) => {
          const n = counts[dir] ?? 0;
          const over = n > DIRECTION_CAP;
          return (
            <li key={dir} className={cn("flex justify-between text-xs", over && "font-medium text-destructive")}>
              <span className={cn(!over && n === 0 && "text-muted-foreground")}>{DIRECTION_LABELS[dir]}</span>
              <span className="tabular-nums">
                {n}/{DIRECTION_CAP}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
