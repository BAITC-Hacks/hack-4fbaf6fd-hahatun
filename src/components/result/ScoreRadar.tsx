"use client";

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, Tooltip } from "recharts";
import type { DistrictResult, Indicator } from "@/lib/types";
import { INDICATOR_LABELS } from "@/lib/types";
import { formatValue } from "@/lib/ui/format";

const INDICATORS = Object.keys(INDICATOR_LABELS) as Indicator[];

const SERIES = [
  { key: "before", name: "До", color: "var(--chart-5)", fillOpacity: 0.12 },
  { key: "after", name: "После", color: "var(--chart-1)", fillOpacity: 0.2 },
] as const;

// Ten indicators of one district before and after the measures, scale 0..100.
export function ScoreRadar({ district }: { district: DistrictResult }) {
  const data = INDICATORS.map((code) => ({
    code,
    before: district.before[code],
    after: district.after[code],
  }));
  return (
    <figure className="flex flex-col items-center gap-2">
      <RadarChart responsive data={data} outerRadius="72%" style={{ width: "100%", aspectRatio: 1.1 }}>
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis
          dataKey="code"
          tick={{ fill: "var(--muted-foreground)", fontSize: 12, fontFamily: "var(--font-mono)" }}
        />
        <PolarRadiusAxis domain={[0, 100]} tickCount={6} tick={false} axisLine={false} />
        {SERIES.map((s) => (
          <Radar
            key={s.key}
            name={s.name}
            dataKey={s.key}
            stroke={s.color}
            fill={s.color}
            fillOpacity={s.fillOpacity}
            strokeWidth={2}
            isAnimationActive={false}
          />
        ))}
        <Tooltip
          labelFormatter={(code) => `${code} · ${INDICATOR_LABELS[code as Indicator] ?? ""}`}
          formatter={(value) => formatValue(Number(value))}
          contentStyle={{ borderRadius: 8, borderColor: "var(--border)", backgroundColor: "var(--popover)", fontSize: 12 }}
        />
      </RadarChart>
      <figcaption className="flex gap-4 text-xs text-muted-foreground">
        {SERIES.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
