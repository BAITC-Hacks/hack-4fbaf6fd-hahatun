import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { isDefaultDataset, type Dataset } from "@/lib/dataset";
import type { Decision, DistrictId, MeasureId } from "@/lib/types";
import { summarizeSet } from "@/lib/ui/cabinet";
import { savePendingRun } from "@/lib/ui/pending-run";
import { setDistrict, toggleMeasure } from "@/lib/ui/scenario";
import { getTeamName } from "@/lib/ui/team";

const FALLBACK_TEAM = "Команда без названия";

/** Cabinet state: the chosen set, its live summary and the hand-off to the live consilium page. */
export function useCabinet(initial: Decision[], ds: Dataset) {
  const router = useRouter();
  const [decisions, setDecisions] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const summary = useMemo(() => summarizeSet(decisions, ds), [decisions, ds]);

  function submit() {
    if (!summary.validation.ok || submitting) return;
    setSubmitting(true);
    savePendingRun({
      teamName: getTeamName() || FALLBACK_TEAM,
      scenario: { decisions },
      ...(isDefaultDataset(ds) ? {} : { dataset: ds }),
    });
    router.push("/result/live");
  }

  return {
    decisions,
    summary,
    submitting,
    submit,
    toggle: (id: MeasureId) => setDecisions((prev) => toggleMeasure(prev, id)),
    pickDistrict: (id: MeasureId, district: DistrictId) => setDecisions((prev) => setDistrict(prev, id, district)),
    reset: () => setDecisions([]),
  };
}
