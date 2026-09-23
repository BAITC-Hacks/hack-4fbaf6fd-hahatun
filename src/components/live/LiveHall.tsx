import type { ExpertRole } from "@/lib/types";
import { ArbiterResolution } from "@/components/consilium/ArbiterResolution";
import { DraftHistory } from "@/components/consilium/DraftHistory";
import { ExpertTable } from "@/components/consilium/ExpertTable";
import { HallSection } from "@/components/consilium/HallSection";
import { ReviewerBoard } from "@/components/consilium/ReviewerBoard";
import { DeltaValue } from "@/components/result/DeltaValue";
import { formatScore } from "@/lib/ui/format";
import { humanizeParts } from "@/lib/ui/humanize";
import type { LiveRun } from "@/lib/ui/run-stream";

const ROLES: ExpertRole[] = ["transport", "ecology", "social", "safety", "service", "finance"];

// The council hall filled in as events arrive; each block appears once its data exists.
export function LiveHall({ run: raw }: { run: LiveRun }) {
  const run = humanizeParts(raw);
  const expertsRunning = run.stages.experts === "start";
  const pending = expertsRunning ? ROLES.filter((r) => !run.opinions.some((o) => o.role === r)) : [];
  return (
    <div className="space-y-12">
      {run.engine && (
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10">
          <span className="text-sm text-muted-foreground">Score набора</span>
          <span className="font-display text-2xl font-semibold tabular-nums">{formatScore(run.engine.score)}</span>
          <DeltaValue value={run.engine.delta} className="text-sm" />
          <span className="text-sm text-muted-foreground tabular-nums">
            к базе {formatScore(run.engine.baseScore)}
          </span>
        </p>
      )}
      {(expertsRunning || run.opinions.length > 0) && (
        <HallSection title="Стол экспертов" hint="Шесть экспертов оценивают набор по своим направлениям.">
          <ExpertTable opinions={run.opinions} facts={run.facts} pending={pending} />
        </HallSection>
      )}
      {run.reviews.length > 0 && (
        <HallSection title="Табло ревизоров" hint="Каждый черновик проверяется по шести условиям.">
          <ReviewerBoard reviews={run.reviews} />
        </HallSection>
      )}
      {run.drafts.length > 0 && (
        <HallSection title="История черновиков" hint="Абзацы, отклонённые ревизорами, отмечены красным.">
          <DraftHistory drafts={run.drafts} reviews={run.reviews} />
        </HallSection>
      )}
      {run.resolution && (
        <HallSection title="Резолюция арбитра">
          <ArbiterResolution resolution={run.resolution} runId={run.runId ?? "live"} facts={run.facts} />
        </HallSection>
      )}
    </div>
  );
}
