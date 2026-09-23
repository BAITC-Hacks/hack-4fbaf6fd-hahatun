import { HEAT_MAX, HEAT_MIN, heatColor } from "./heat";

const MID = (HEAT_MIN + HEAT_MAX) / 2;

// Legend bar for the district heat scale, same colours as the map fills.
export function HeatLegend() {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-mono text-[0.68rem] tracking-[0.12em] text-muted-foreground uppercase">
        D района: {HEAT_MIN} → {HEAT_MAX}
      </p>
      <div
        aria-hidden
        className="h-2 rounded-full ring-1 ring-border"
        style={{ background: `linear-gradient(to right, ${heatColor(HEAT_MIN)}, ${heatColor(MID)}, ${heatColor(HEAT_MAX)})` }}
      />
      <div aria-hidden className="flex justify-between font-mono text-[0.68rem] text-muted-foreground tabular-nums">
        <span>{HEAT_MIN}</span>
        <span>{MID}</span>
        <span>{HEAT_MAX}</span>
      </div>
    </div>
  );
}
