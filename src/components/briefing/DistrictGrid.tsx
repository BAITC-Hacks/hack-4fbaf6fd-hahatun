import type { District, DistrictId } from "@/lib/types";
import { DistrictTile } from "./DistrictTile";

interface DistrictGridProps {
  districts: District[];
  scores: Record<DistrictId, number>; // district D before any decision
}

// Weakest district first: the briefing starts from where the city hurts most.
export function DistrictGrid({ districts, scores }: DistrictGridProps) {
  const sorted = [...districts].sort((a, b) => scores[a.id] - scores[b.id]);
  const weakestId = sorted[0]?.id;
  return (
    <section aria-labelledby="districts-title" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="districts-title" className="font-display text-lg font-semibold">
          Районы
        </h2>
        <p className="text-xs text-muted-foreground">
          D района от 0 до 100, показатели ниже 40 считаются критическими и штрафуют Score
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {sorted.map((d) => (
          <DistrictTile key={d.id} district={d} score={scores[d.id]} weakest={d.id === weakestId} />
        ))}
      </div>
    </section>
  );
}
