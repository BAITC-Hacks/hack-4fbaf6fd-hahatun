import type { Metadata } from "next";
import { ConsiliumHall } from "@/components/consilium/ConsiliumHall";
import { Disclosure } from "@/components/result/Disclosure";
import { DistrictComparison } from "@/components/result/DistrictComparison";
import { HowCalculated } from "@/components/result/HowCalculated";
import { NextSteps } from "@/components/result/NextSteps";
import { SandboxNotice } from "@/components/sandbox/SandboxNotice";
import { ShockEventCard } from "@/components/result/ShockEventCard";
import { UsagePanel } from "@/components/result/UsagePanel";
import { VerdictSummary } from "@/components/result/VerdictSummary";
import { humanizeRun } from "@/lib/ui/humanize";
import { getRun, SAMPLE_RUN_ID } from "@/lib/ui/run-source";

export const metadata: Metadata = { title: "Вердикт" };

const DATE_FORMAT = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Asia/Almaty",
});

// Answer first (summary), one next step (mandates), details on demand (disclosures).
export default async function ResultPage({ params }: PageProps<"/result/[runId]">) {
  const { runId } = await params;
  const run = humanizeRun(await getRun(runId));

  return (
    <>
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Вердикт</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {run.teamName} · <span className="tabular-nums">{DATE_FORMAT.format(new Date(run.createdAt))}</span> · прогон{" "}
          <span className="font-mono">{runId}</span>
          {run.id !== SAMPLE_RUN_ID && (
            <>
              {" · "}
              <a
                href={`/api/runs/${run.id}/pitch`}
                download
                className="underline underline-offset-4 hover:text-foreground"
              >
                Скачать краткую презентацию (.md)
              </a>
            </>
          )}
        </p>
      </header>
      <div className="flex flex-col gap-12">
        {run.sandbox && <SandboxNotice name={run.sandbox.datasetName} />}
        <VerdictSummary run={run} />
        <NextSteps run={run} />
        <ShockEventCard run={run} />
        <ConsiliumHall run={run} />
        <div className="divide-y divide-border border-y border-border">
          <Disclosure size="section" title="Районы до и после">
            <DistrictComparison
              districts={run.engine.districts}
              scenario={run.scenario}
              dataset={run.sandbox?.dataset}
            />
          </Disclosure>
          <Disclosure size="section" title="Как считалось">
            <HowCalculated run={run} />
          </Disclosure>
        </div>
        <UsagePanel run={run} />
      </div>
    </>
  );
}
