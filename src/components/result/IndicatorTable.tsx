import type { DistrictResult, Indicator } from "@/lib/types";
import { CRITICAL_THRESHOLD, INDICATOR_LABELS } from "@/lib/types";
import { formatScore, formatValue } from "@/lib/ui/format";
import { cn } from "@/lib/utils";
import { DeltaValue } from "@/components/result/DeltaValue";

const INDICATORS = Object.keys(INDICATOR_LABELS) as Indicator[];

function valueClass(value: number): string {
  return cn("px-3 py-2 text-right tabular-nums", value < CRITICAL_THRESHOLD && "text-destructive");
}

// Ten indicators of one district: before, after and the change; values below the threshold in red.
export function IndicatorTable({ district }: { district: DistrictResult }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-xs text-muted-foreground">
        <tr className="border-b border-border">
          <th className="px-3 py-2 text-left font-normal">Показатель</th>
          <th className="px-3 py-2 text-right font-normal">До</th>
          <th className="px-3 py-2 text-right font-normal">После</th>
          <th className="px-3 py-2 text-right font-normal">Изменение</th>
        </tr>
      </thead>
      <tbody>
        {INDICATORS.map((code) => {
          const before = district.before[code];
          const after = district.after[code];
          return (
            <tr key={code} className="border-b border-border/60">
              <td className="px-3 py-2">
                <span className="mr-2 font-mono text-xs text-muted-foreground">{code}</span>
                {INDICATOR_LABELS[code]}
              </td>
              <td className={valueClass(before)}>{formatValue(before)}</td>
              <td className={cn(valueClass(after), "font-medium")}>{formatValue(after)}</td>
              <td className="px-3 py-2 text-right">
                <DeltaValue value={after - before} />
              </td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td className="px-3 pt-3 font-medium">Оценка района D</td>
          <td className="px-3 pt-3 text-right tabular-nums">{formatScore(district.dBefore)}</td>
          <td className="px-3 pt-3 text-right font-medium tabular-nums">{formatScore(district.dAfter)}</td>
          <td className="px-3 pt-3 text-right">
            <DeltaValue value={district.dAfter - district.dBefore} />
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
