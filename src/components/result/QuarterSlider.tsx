"use client";

import { HORIZON_QUARTERS } from "@/lib/types";
import { formatScore } from "@/lib/ui/format";
import { quarterLabel } from "@/lib/ui/timeline";

interface QuarterSliderProps {
  quarter: number;
  score: number;
  nCrit: number;
  onChange: (q: number) => void;
}

// Native range over quarters 0..8: arrows, Home and End work out of the box.
export function QuarterSlider({ quarter, score, nCrit, onChange }: QuarterSliderProps) {
  return (
    <div className="flex flex-col gap-2 border-y border-border py-3">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="font-medium">
          {quarterLabel(quarter)}
        </span>
        <span className="text-xs text-muted-foreground">8 кварталов · 2 года</span>
      </div>
      <input
        type="range"
        min={0}
        max={HORIZON_QUARTERS}
        step={1}
        value={quarter}
        aria-label="Квартал"
        aria-valuetext={quarterLabel(quarter)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
      {/* Quiet scale under the track: which notch is which quarter. */}
      <div aria-hidden="true" className="flex justify-between px-1 font-mono text-[0.7rem] text-muted-foreground tabular-nums">
        {Array.from({ length: HORIZON_QUARTERS + 1 }, (_, q) => (
          <span key={q} className={q === quarter ? "font-medium text-foreground" : undefined}>
            {q}
          </span>
        ))}
      </div>
      <p className="text-sm tabular-nums">
        Score к кварталу {quarter}: {formatScore(score)}
        {nCrit > 0 && (
          <span className="text-xs text-muted-foreground">
            {" · "}
            {nCrit} {critWord(nCrit)}
          </span>
        )}
      </p>
    </div>
  );
}

// 1 критическое значение, 2–4 критических значения, 5+ критических значений
function critWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "критическое значение";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "критических значения";
  return "критических значений";
}
