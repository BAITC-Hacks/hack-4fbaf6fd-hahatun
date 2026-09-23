import { Check, X } from "lucide-react";
import type { Stage } from "@/lib/types";
import { formatScore } from "@/lib/ui/format";
import { OUTCOME_LABELS, STAGE_LABELS } from "@/lib/ui/labels";
import type { LiveRun, StageStatus } from "@/lib/ui/run-stream";
import { cn } from "@/lib/utils";

const PIPELINE: Stage[] = ["validate", "engine", "optimize", "experts", "draft", "review", "arbiter", "persist"];
const EXPERTS_TOTAL = 6;

// Short live detail per stage, shown once the matching payload has arrived.
function stageDetail(stage: Stage, run: LiveRun): string | undefined {
  const lastReview = run.reviews.at(-1);
  const lastDraft = run.drafts.at(-1);
  switch (stage) {
    case "engine":
      return run.engine && `Score ${formatScore(run.engine.score)}`;
    case "optimize":
      return run.optimizer && `лучший Score ${formatScore(run.optimizer.bestScore)}`;
    case "experts":
      return run.opinions.length > 0 ? `${run.opinions.length} из ${EXPERTS_TOTAL}` : undefined;
    case "draft":
      return lastDraft && `версия ${lastDraft.version}`;
    case "review":
      return lastReview && `круг ${lastReview.round}: ${lastReview.passed} из ${lastReview.total}`;
    case "arbiter":
      return run.resolution && OUTCOME_LABELS[run.resolution.outcome];
    default:
      return undefined;
  }
}

function markFor(status?: StageStatus) {
  if (status === "done") return <Check aria-hidden className="size-4 text-outcome-approve" />;
  if (status === "error") return <X aria-hidden className="size-4 text-destructive" />;
  if (status === "start") return <span aria-hidden className="size-2 rounded-full bg-sky motion-safe:animate-pulse" />;
  return <span aria-hidden className="size-2.5 rounded-full border border-muted-foreground/50" />;
}

const STATUS_TEXT: Record<StageStatus, string> = { start: "идёт", done: "готово", error: "ошибка" };

export function StageList({ run }: { run: LiveRun }) {
  return (
    <ol aria-label="Стадии заседания" className="divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
      {PIPELINE.map((stage, i) => {
        const status = run.stages[stage];
        const detail = stageDetail(stage, run);
        return (
          <li key={stage} className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="w-6 font-mono text-xs text-muted-foreground tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="flex size-4 items-center justify-center">
              {markFor(status)}
            </span>
            <span className={cn("font-medium", !status && "text-muted-foreground")}>{STAGE_LABELS[stage]}</span>
            {status && (
              <span
                className={cn(
                  "text-xs",
                  status === "start" && "text-sky",
                  status === "done" && "sr-only",
                  status === "error" && "text-destructive",
                )}
              >
                {STATUS_TEXT[status]}
              </span>
            )}
            {detail && <span className="ml-auto text-muted-foreground tabular-nums">{detail}</span>}
          </li>
        );
      })}
    </ol>
  );
}
