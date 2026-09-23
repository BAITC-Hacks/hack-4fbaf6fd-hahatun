"use client";

import { useState } from "react";
import { DECISIONS_COUNT, type Decision } from "@/lib/types";
import { MandateNotice, type MandateInfo } from "./MandateNotice";
import { MeasureCatalog } from "./MeasureCatalog";
import { SetPanel } from "./SetPanel";
import { useCabinet } from "./useCabinet";

interface CabinetProps {
  initialDecisions: Decision[];
  baseScore: number;
  mandate?: MandateInfo; // set when the page was opened from a resolution mandate
}

export function Cabinet({ initialDecisions, baseScore, mandate }: CabinetProps) {
  const cabinet = useCabinet(initialDecisions);
  const [showMandate, setShowMandate] = useState(Boolean(mandate));
  const { decisions, summary } = cabinet;
  const full = decisions.length >= DECISIONS_COUNT;

  function reset() {
    cabinet.reset();
    setShowMandate(false);
  }

  return (
    <div className="grid items-start gap-8 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_340px]">
      <div className="flex min-w-0 flex-col gap-8">
        {mandate && showMandate && <MandateNotice {...mandate} />}
        <MeasureCatalog
          decisions={decisions}
          counts={summary.directionCounts}
          blockedReason={full ? `Уже выбрано ${DECISIONS_COUNT} мер — уберите одну в наборе справа` : undefined}
          onToggle={cabinet.toggle}
          onDistrictChange={cabinet.pickDistrict}
        />
      </div>
      <SetPanel
        decisions={decisions}
        cost={summary.validation.cost}
        errors={summary.errors}
        score={summary.score}
        baseScore={baseScore}
        canSubmit={summary.validation.ok}
        submitting={cabinet.submitting}
        onRemove={cabinet.toggle}
        onReset={reset}
        onSubmit={cabinet.submit}
      />
    </div>
  );
}
