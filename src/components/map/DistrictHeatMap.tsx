"use client";

import { useState } from "react";
import { DISTRICT_LABELS, type DistrictId } from "@/lib/types";
import { formatScore } from "@/lib/ui/format";
import { DistrictShape } from "./DistrictShape";
import { DISTRICT_SHAPES, RIVER_PATH, VIEW_BOX } from "./geometry";
import { HeatLegend } from "./HeatLegend";

const IDS = Object.keys(DISTRICT_LABELS) as DistrictId[];
const TITLE = "Схема районов Астаны";

interface DistrictHeatMapProps {
  values: Record<DistrictId, number>; // district D shown in the shapes
  previous?: Record<DistrictId, number>; // D before, enables the delta line
  selected?: DistrictId;
  onSelect?: (id: DistrictId) => void;
  caption?: string;
}

// Stylised Astana with districts filled by D on a fixed 45..65 heat scale.
export function DistrictHeatMap({ values, previous, selected, onSelect, caption }: DistrictHeatMapProps) {
  const [focused, setFocused] = useState<DistrictId | null>(null);
  const weakest = IDS.reduce((a, b) => (values[b] < values[a] ? b : a));
  const summary = IDS.map((id) => `${DISTRICT_LABELS[id]} ${formatScore(values[id])}`).join(", ");
  const outline = (id: DistrictId) => DISTRICT_SHAPES[id].path;
  return (
    <figure className="@container">
      <div className="flex flex-col gap-5 @3xl:flex-row @3xl:items-end">
        <svg
          viewBox={VIEW_BOX}
          role={onSelect ? "group" : "img"}
          aria-label={onSelect ? (caption ?? TITLE) : `${caption ?? TITLE}: ${summary}`}
          className="w-full min-w-0 @3xl:max-w-[36rem] @3xl:flex-1"
        >
          {IDS.map((id) => (
            <DistrictShape
              key={id}
              id={id}
              value={values[id]}
              previous={previous?.[id]}
              selected={id === selected}
              onSelect={onSelect}
              onFocusVisible={setFocused}
            />
          ))}
          <path d={RIVER_PATH} fill="none" stroke="var(--sky)" strokeWidth={3} strokeLinecap="round" aria-hidden className="pointer-events-none" />
          <g aria-hidden fill="none" strokeLinejoin="round" className="pointer-events-none">
            {focused && <path d={outline(focused)} stroke="var(--ring)" strokeWidth={6} />}
            {weakest !== selected && <path d={outline(weakest)} stroke="var(--foreground)" strokeOpacity={0.55} strokeWidth={1.25} />}
            {selected && <path d={outline(selected)} stroke="var(--foreground)" strokeWidth={3} />}
          </g>
        </svg>
        <figcaption className="flex flex-col gap-4 @3xl:w-60 @3xl:shrink-0">
          {caption && <p className="text-sm font-medium">{caption}</p>}
          <HeatLegend />
          <p className="text-xs text-muted-foreground">
            Схема, не карта. Тонкая обводка — слабейший район
            {onSelect ? ", толстая — выбранный. Нажмите на район, чтобы открыть его показатели." : "."}
          </p>
        </figcaption>
      </div>
    </figure>
  );
}
