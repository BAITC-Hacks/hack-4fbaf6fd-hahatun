"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DECISIONS_COUNT, type Decision } from "@/lib/types";
import { BudgetPanel } from "./BudgetPanel";
import { MandateNotice, type MandateInfo } from "./MandateNotice";
import { MeasureCatalog } from "./MeasureCatalog";
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
    <div className="grid items-start gap-6 md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_340px]">
      <div className="flex min-w-0 flex-col gap-6">
        {mandate && showMandate && <MandateNotice {...mandate} />}
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Нажмите на карточку, чтобы добавить меру. Для районных мер выберите район.
          </p>
          <Button variant="ghost" size="sm" disabled={decisions.length === 0} onClick={reset}>
            <RotateCcw data-icon="inline-start" />
            Сбросить набор
          </Button>
        </div>
        <MeasureCatalog
          decisions={decisions}
          counts={summary.directionCounts}
          blockedReason={full ? `Уже выбрано ${DECISIONS_COUNT} мер` : undefined}
          onToggle={cabinet.toggle}
          onDistrictChange={cabinet.pickDistrict}
        />
      </div>
      <BudgetPanel
        cost={summary.validation.cost}
        count={decisions.length}
        directionCounts={summary.directionCounts}
        errors={summary.errors}
        score={summary.score}
        baseScore={baseScore}
        canSubmit={summary.validation.ok}
        submitting={cabinet.submitting}
        onSubmit={cabinet.submit}
      />
    </div>
  );
}
