"use client";

import { useState } from "react";
import type { DistrictId, DistrictResult } from "@/lib/types";
import { DISTRICT_LABELS } from "@/lib/types";
import { DistrictHeatMap } from "@/components/map/DistrictHeatMap";
import { DistrictSwitcher } from "@/components/result/DistrictSwitcher";
import { IndicatorTable } from "@/components/result/IndicatorTable";
import { ScoreRadar } from "@/components/result/ScoreRadar";

// District whose D moved the most; ties resolve to the first in order.
function mostChanged(districts: DistrictResult[]): DistrictId {
  const change = (d: DistrictResult) => Math.abs(d.dAfter - d.dBefore);
  return districts.reduce((best, d) => (change(d) > change(best) ? d : best)).id;
}

function dOf(districts: DistrictResult[], key: "dBefore" | "dAfter") {
  return Object.fromEntries(districts.map((d) => [d.id, d[key]])) as Record<DistrictId, number>;
}

// District map and switcher with radar and indicator table for the selected district.
export function DistrictComparison({ districts }: { districts: DistrictResult[] }) {
  const [selected, setSelected] = useState<DistrictId>(() => mostChanged(districts));
  const district = districts.find((d) => d.id === selected) ?? districts[0];
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        Выбран район {DISTRICT_LABELS[district.id]}. По умолчанию открыт район с наибольшим изменением D.
      </p>
      <DistrictHeatMap
        values={dOf(districts, "dAfter")}
        previous={dOf(districts, "dBefore")}
        selected={district.id}
        onSelect={setSelected}
        caption="D районов после решений, под значением — изменение"
      />
      <DistrictSwitcher districts={districts} selected={district.id} onSelect={setSelected} />
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <ScoreRadar district={district} />
        <IndicatorTable district={district} />
      </div>
    </div>
  );
}
