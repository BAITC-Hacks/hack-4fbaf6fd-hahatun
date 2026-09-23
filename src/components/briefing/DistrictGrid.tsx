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
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {sorted.map((d) => (
        <DistrictTile key={d.id} district={d} score={scores[d.id]} weakest={d.id === weakestId} />
      ))}
    </div>
  );
}
