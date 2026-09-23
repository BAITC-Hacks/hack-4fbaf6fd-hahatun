import {
  CRITICAL_THRESHOLD,
  DIRECTION_LABELS,
  INDICATOR_LABELS,
  type Direction,
  type District,
  type Indicator,
} from "@/lib/types";
import { formatPercent, formatScore, formatValue } from "@/lib/ui/format";
import { cn } from "@/lib/utils";

interface DistrictTileProps {
  district: District;
  score: number; // district D before any decision
  weakest?: boolean;
}

const GROUPS: [Direction, Indicator[]][] = [
  ["transport", ["T1", "T2"]],
  ["ecology", ["E1", "E2"]],
  ["social", ["S1", "S2"]],
  ["safety", ["B1", "B2"]],
  ["service", ["C1", "C2"]],
];

// D bands from docs/plan.md §8: the band marker follows the district score.
function toneOf(d: number) {
  if (d < 50) return { dot: "bg-outcome-return", text: "text-outcome-return", label: "отстаёт" };
  if (d < 58) return { dot: "bg-outcome-conditions", text: "text-outcome-conditions", label: "в среднем" };
  return { dot: "bg-outcome-approve", text: "text-outcome-approve", label: "благополучно" };
}

function IndicatorRow({ code, value }: { code: Indicator; value: number }) {
  const critical = value < CRITICAL_THRESHOLD;
  return (
    <div
      className={cn("flex items-center gap-2 text-xs", critical && "text-destructive")}
      title={`${INDICATOR_LABELS[code]}: ${formatValue(value)}${critical ? ", критично (< 40)" : ""}`}
    >
      <span className="w-5 font-mono">{code}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <span
          className={cn("block h-full rounded-full", critical ? "bg-destructive" : "bg-primary/60")}
          style={{ width: `${value}%` }}
        />
      </span>
      <span className={cn("w-6 text-right tabular-nums", critical && "font-semibold")}>{formatValue(value)}</span>
    </div>
  );
}

export function DistrictTile({ district, score, weakest = false }: DistrictTileProps) {
  const tone = toneOf(score);
  const criticals = GROUPS.flatMap(([, codes]) => codes).filter((k) => district.indicators[k] < CRITICAL_THRESHOLD);
  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-card p-4",
        weakest ? "border-outcome-return/50" : "border-border",
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium">{district.name}</h3>
          <p className="text-xs text-muted-foreground tabular-nums">население {formatPercent(district.population)}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-2xl leading-none font-semibold tabular-nums">{formatScore(score)}</p>
          <p className={cn("mt-1.5 flex items-center justify-end gap-1.5 text-xs", tone.text)}>
            <span aria-hidden="true" className={cn("size-2 rounded-[2px]", tone.dot)} />
            {weakest ? "слабейший" : tone.label}
          </p>
        </div>
      </header>
      <p className="text-xs text-muted-foreground">{district.profile}</p>
      <div className="flex flex-col gap-2">
        {GROUPS.map(([dir, codes]) => (
          <div key={dir} className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">{DIRECTION_LABELS[dir]}</p>
            {codes.map((k) => (
              <IndicatorRow key={k} code={k} value={district.indicators[k]} />
            ))}
          </div>
        ))}
      </div>
      {criticals.length > 0 && (
        <p className="mt-auto rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">
          Критично: {criticals.map((k) => `${k} ${formatValue(district.indicators[k])}`).join(", ")}
        </p>
      )}
    </article>
  );
}
