import type { Decision, EngineResult, MeasureId } from "@/lib/types";
import { DISTRICT_LABELS } from "@/lib/types";
import { formatDelta } from "@/lib/ui/format";
import { MEASURE_SHORT } from "@/lib/ui/labels";
import { cn } from "@/lib/utils";

interface MeasureContributionsProps {
  contributions: EngineResult["contributions"];
  decisions: Decision[];
}

// How much Score each measure adds: score(all) − score(all without the measure), sorted desc.
export function MeasureContributions({ contributions, decisions }: MeasureContributionsProps) {
  const rows = [...contributions].sort((a, b) => b.delta - a.delta);
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.delta)), 0.01);
  const placeOf = (measureId: string) => {
    const districtId = decisions.find((d) => d.measureId === measureId)?.districtId;
    return districtId ? DISTRICT_LABELS[districtId] : "весь город";
  };
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.measureId} className="grid grid-cols-[14rem_7rem_1fr_4rem] items-center gap-3 text-sm">
          <span className="first-letter:uppercase">{MEASURE_SHORT[r.measureId as MeasureId]}</span>
          <span className="text-muted-foreground">{placeOf(r.measureId)}</span>
          <span className="h-1.5 rounded-full bg-muted">
            <span
              className={cn("block h-full rounded-full", r.delta >= 0 ? "bg-sky" : "bg-destructive")}
              style={{ width: `${(Math.abs(r.delta) / maxAbs) * 100}%` }}
            />
          </span>
          <span className="text-right tabular-nums">{formatDelta(r.delta)}</span>
        </li>
      ))}
    </ul>
  );
}
