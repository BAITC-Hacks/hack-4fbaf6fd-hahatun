import type { DistrictId, DistrictResult } from "@/lib/types";
import { DISTRICT_LABELS } from "@/lib/types";
import { formatScore } from "@/lib/ui/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DistrictSwitcherProps {
  districts: DistrictResult[];
  selected: DistrictId;
  onSelect: (id: DistrictId) => void;
}

// Row of district buttons with D before → after; the selected one is highlighted.
export function DistrictSwitcher({ districts, selected, onSelect }: DistrictSwitcherProps) {
  return (
    <div role="group" aria-label="Район" className="grid grid-cols-5 gap-2">
      {districts.map((d) => {
        const active = d.id === selected;
        return (
          <Button
            key={d.id}
            variant="outline"
            aria-pressed={active}
            onClick={() => onSelect(d.id)}
            className={cn(
              "h-auto flex-col items-start gap-0.5 px-3 py-2 text-left",
              active && "border-sky bg-sky/10 hover:bg-sky/15",
            )}
          >
            <span className="font-medium">{DISTRICT_LABELS[d.id]}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              D {formatScore(d.dBefore)} → {formatScore(d.dAfter)}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
