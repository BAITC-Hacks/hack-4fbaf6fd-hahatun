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

// Flat row of district toggles with D before → after; the selected one gets a sky tint, no nested boxes.
export function DistrictSwitcher({ districts, selected, onSelect }: DistrictSwitcherProps) {
  return (
    <div role="group" aria-label="Район" className="grid grid-cols-2 gap-1 border-y border-border py-1 sm:grid-cols-5">
      {districts.map((d) => {
        const active = d.id === selected;
        return (
          <Button
            key={d.id}
            variant="ghost"
            aria-pressed={active}
            onClick={() => onSelect(d.id)}
            className={cn(
              "h-auto flex-col items-start gap-0.5 px-3 py-2 text-left",
              active && "bg-accent text-accent-foreground hover:bg-accent",
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
