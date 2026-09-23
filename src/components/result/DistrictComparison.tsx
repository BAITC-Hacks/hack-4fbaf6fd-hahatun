"use client";

import { useMemo, useState } from "react";
import type { Dataset } from "@/lib/dataset";
import type { DistrictId, DistrictResult, Scenario } from "@/lib/types";
import { DISTRICT_LABELS, HORIZON_QUARTERS } from "@/lib/types";
import { quarterView } from "@/lib/ui/timeline";
import { DistrictHeatMap } from "@/components/map/DistrictHeatMap";
import { DistrictSwitcher } from "@/components/result/DistrictSwitcher";
import { IndicatorTable } from "@/components/result/IndicatorTable";
import { QuarterSlider } from "@/components/result/QuarterSlider";
import { ScoreRadar } from "@/components/result/ScoreRadar";

// District whose D moved the most; ties resolve to the first in order.
function mostChanged(districts: DistrictResult[]): DistrictId {
  const change = (d: DistrictResult) => Math.abs(d.dAfter - d.dBefore);
  return districts.reduce((best, d) => (change(d) > change(best) ? d : best)).id;
}

function dOf(districts: DistrictResult[], key: "dBefore" | "dAfter") {
  return Object.fromEntries(districts.map((d) => [d.id, d[key]])) as Record<DistrictId, number>;
}

// District map and switcher with radar and indicator table for the selected district; the quarter slider
// replays "after" quarter by quarter, "before" stays the baseline. Quarter 8 is the engine result.
interface DistrictComparisonProps {
  districts: DistrictResult[];
  scenario: Scenario;
  dataset?: Dataset; // sandbox run: replay quarters on its own data
}

export function DistrictComparison({ districts: final, scenario, dataset }: DistrictComparisonProps) {
  const [selected, setSelected] = useState<DistrictId>(() => mostChanged(final));
  const [quarter, setQuarter] = useState(HORIZON_QUARTERS);
  const view = useMemo(() => quarterView(final, scenario, quarter, dataset), [final, scenario, quarter, dataset]);
  const districts = view.districts;
  const district = districts.find((d) => d.id === selected) ?? districts[0];
  return (
    <div className="flex flex-col gap-6">
      <QuarterSlider quarter={quarter} score={view.score} nCrit={view.nCrit} onChange={setQuarter} />
      <p className="text-sm text-muted-foreground">
        Выбран район {DISTRICT_LABELS[district.id]}, значения к кварталу {quarter}. По умолчанию открыт район с
        наибольшим изменением D.
      </p>
      <DistrictHeatMap
        values={dOf(districts, "dAfter")}
        previous={dOf(districts, "dBefore")}
        selected={district.id}
        onSelect={setSelected}
        caption={`D районов к кварталу ${quarter}, под значением — изменение от старта`}
      />
      <DistrictSwitcher districts={districts} selected={district.id} onSelect={setSelected} />
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <ScoreRadar district={district} />
        <IndicatorTable district={district} />
      </div>
    </div>
  );
}
