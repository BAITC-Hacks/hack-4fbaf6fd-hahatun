import type { Metadata } from "next";
import { ConsiliumHall } from "@/components/consilium/ConsiliumHall";
import { PageHeader } from "@/components/shell/PageHeader";
import { DistrictComparison } from "@/components/result/DistrictComparison";
import { HowCalculated } from "@/components/result/HowCalculated";
import { ShockEventCard } from "@/components/result/ShockEventCard";
import { VerdictHeader } from "@/components/result/VerdictHeader";
import { getRun, SAMPLE_RUN_ID } from "@/lib/ui/run-source";

export const metadata: Metadata = { title: "Вердикт" };

export default async function ResultPage({ params }: PageProps<"/result/[runId]">) {
  const { runId } = await params;
  const run = await getRun(runId);

  return (
    <>
      <PageHeader
        title="Вердикт"
        lead="Итоговый Score, изменения по районам и резолюция консилиума."
        meta={
          <>
            Прогон <span className="font-mono">{runId}</span>
            {run.id !== SAMPLE_RUN_ID && (
              <>
                {" · "}
                <a href={`/api/runs/${run.id}/pitch`} download className="underline underline-offset-4 hover:text-foreground">
                  Скачать краткую презентацию (.md)
                </a>
              </>
            )}
          </>
        }
      />
      <div className="flex flex-col gap-8">
        <VerdictHeader run={run} />
        <ShockEventCard run={run} />
        <DistrictComparison districts={run.engine.districts} />
        <HowCalculated run={run} />
        <ConsiliumHall run={run} />
      </div>
    </>
  );
}
