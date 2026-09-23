import type { FocusEvent, KeyboardEvent } from "react";
import { DISTRICT_LABELS, type DistrictId } from "@/lib/types";
import { formatDelta, formatScore, trendOf, type Trend } from "@/lib/ui/format";
import { cn } from "@/lib/utils";
import { DISTRICT_SHAPES } from "./geometry";
import { heatColor } from "./heat";

// Darkened toward ink (light theme) or lightened (dark theme) so small text stays ≥ 4.5:1 on the tint.
const DELTA_FILL: Record<Trend, string> = {
  up: "color-mix(in oklch, var(--outcome-approve) 65%, var(--foreground))",
  down: "color-mix(in oklch, var(--destructive) 65%, var(--foreground))",
  flat: "var(--foreground)",
};

interface DistrictShapeProps {
  id: DistrictId;
  value: number;
  previous?: number;
  selected: boolean;
  onSelect?: (id: DistrictId) => void;
  onFocusVisible?: (id: DistrictId | null) => void;
}

// One district: heat-filled shape with name, D and optional delta; a button when onSelect is given.
export function DistrictShape({ id, value, previous, selected, onSelect, onFocusVisible }: DistrictShapeProps) {
  const { path, label } = DISTRICT_SHAPES[id];
  const [x, y] = label;
  const delta = previous === undefined ? undefined : value - previous;
  const name = DISTRICT_LABELS[id];
  const top = delta === undefined ? y - 8 : y - 14;
  const button = onSelect && {
    role: "button",
    tabIndex: 0,
    "aria-pressed": selected,
    "aria-label": `${name}: D ${formatScore(value)}${delta === undefined ? "" : `, изменение ${formatDelta(delta)}`}`,
    onClick: () => onSelect(id),
    onKeyDown: (e: KeyboardEvent<SVGGElement>) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      onSelect(id);
    },
    onFocus: (e: FocusEvent<SVGGElement>) => onFocusVisible?.(e.currentTarget.matches(":focus-visible") ? id : null),
    onBlur: () => onFocusVisible?.(null),
  };
  return (
    <g className={cn("group", button && "cursor-pointer outline-none")} {...button}>
      <path
        d={path}
        fill={heatColor(value)}
        stroke="var(--card)"
        strokeWidth={3}
        strokeLinejoin="round"
        className={cn(
          button &&
            "transition-opacity group-hover:opacity-85 group-focus-visible:stroke-ring group-focus-visible:[stroke-width:5] motion-reduce:transition-none",
        )}
      />
      <text x={x} y={top} textAnchor="middle" className="fill-foreground text-[12px] font-medium">
        {name}
      </text>
      <text x={x} y={top + 22} textAnchor="middle" className="fill-foreground font-display text-[20px] font-semibold tabular-nums">
        {formatScore(value)}
      </text>
      {delta !== undefined && (
        <text x={x} y={top + 38} textAnchor="middle" fill={DELTA_FILL[trendOf(delta)]} className="text-[11px] font-semibold tabular-nums">
          {formatDelta(delta)}
        </text>
      )}
    </g>
  );
}
