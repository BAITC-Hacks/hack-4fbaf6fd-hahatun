"use client";

import { useMemo, useState } from "react";
import { SandboxNotice } from "@/components/sandbox/SandboxNotice";
import { useSandbox } from "@/components/sandbox/useSandbox";
import { DEFAULT_DATASET } from "@/lib/dataset";
import { calculate } from "@/lib/engine";
import { clearSandbox } from "@/lib/ui/sandbox";
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
  const sandbox = useSandbox();
  const ds = sandbox ?? DEFAULT_DATASET;
  // The server-computed base covers the case data; a sandbox base is counted here on its own dataset.
  const base = useMemo(
    () => (sandbox ? calculate({ decisions: [] }, [], sandbox).baseScore : baseScore),
    [sandbox, baseScore],
  );
  const cabinet = useCabinet(initialDecisions, ds);
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
        {sandbox && <SandboxNotice name={sandbox.name} onExit={clearSandbox} />}
        {mandate && showMandate && <MandateNotice {...mandate} />}
        <MeasureCatalog
          ds={ds}
          decisions={decisions}
          counts={summary.directionCounts}
          blockedReason={full ? `Уже выбрано ${DECISIONS_COUNT} мер — уберите одну в наборе справа` : undefined}
          onToggle={cabinet.toggle}
          onDistrictChange={cabinet.pickDistrict}
        />
      </div>
      <SetPanel
        decisions={decisions}
        ds={ds}
        cost={summary.validation.cost}
        errors={summary.errors}
        score={summary.score}
        baseScore={base}
        canSubmit={summary.validation.ok}
        submitting={cabinet.submitting}
        onRemove={cabinet.toggle}
        onReset={reset}
        onSubmit={cabinet.submit}
      />
    </div>
  );
}
