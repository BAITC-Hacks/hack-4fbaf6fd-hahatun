import type { Metadata } from "next";
import { ConsiliumHall } from "@/components/consilium/ConsiliumHall";
import { PageHeader } from "@/components/shell/PageHeader";
import { DistrictComparison } from "@/components/result/DistrictComparison";
import { HowCalculated } from "@/components/result/HowCalculated";
import { VerdictHeader } from "@/components/result/VerdictHeader";
import { getRun } from "@/lib/ui/run-source";

export const metadata: Metadata = { title: "Вердикт" };

export default async function ResultPage({ params }: PageProps<"/result/[runId]">) {
  const { runId } = await params;
  const run = await getRun(runId);

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            Шаг 3 из 3 · прогон <span className="normal-case">{runId}</span>
          </>
        }
        title="Вердикт"
        lead="Итоговый Score, изменения по районам и резолюция консилиума."
      />
      <div className="flex flex-col gap-6">
        <VerdictHeader run={run} />
        <DistrictComparison districts={run.engine.districts} />
        <HowCalculated run={run} />
        <ConsiliumHall run={run} />
      </div>
    </>
  );
}
