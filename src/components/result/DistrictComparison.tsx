"use client";

import { useState } from "react";
import type { DistrictId, DistrictResult } from "@/lib/types";
import { DISTRICT_LABELS } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DistrictSwitcher } from "@/components/result/DistrictSwitcher";
import { IndicatorTable } from "@/components/result/IndicatorTable";
import { ScoreRadar } from "@/components/result/ScoreRadar";

// District whose D moved the most; ties resolve to the first in order.
function mostChanged(districts: DistrictResult[]): DistrictId {
  const change = (d: DistrictResult) => Math.abs(d.dAfter - d.dBefore);
  return districts.reduce((best, d) => (change(d) > change(best) ? d : best)).id;
}

// District switcher with radar and indicator table for the selected district.
export function DistrictComparison({ districts }: { districts: DistrictResult[] }) {
  const [selected, setSelected] = useState<DistrictId>(() => mostChanged(districts));
  const district = districts.find((d) => d.id === selected) ?? districts[0];
  return (
    <Card className="gap-6 px-6 py-6">
      <CardHeader className="px-0">
        <CardTitle className="font-display text-lg font-semibold">Районы до и после</CardTitle>
        <CardDescription>
          Выбран район {DISTRICT_LABELS[district.id]}. По умолчанию открыт район с наибольшим изменением D.
        </CardDescription>
      </CardHeader>
      <DistrictSwitcher districts={districts} selected={district.id} onSelect={setSelected} />
      <CardContent className="grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-start gap-6 px-0">
        <ScoreRadar district={district} />
        <IndicatorTable district={district} />
      </CardContent>
    </Card>
  );
}
