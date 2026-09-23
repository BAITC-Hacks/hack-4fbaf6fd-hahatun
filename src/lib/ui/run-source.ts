import { notFound } from "next/navigation";
import type { DistrictId, Outcome, Run } from "@/lib/types";
import { listRuns as listStoredRuns, loadRun } from "@/lib/store/runs";
import sample from "../../../fixtures/sample-run.json";

// Server-only: pages read saved runs from the store; the fixture id keeps the ?replay=1 demo working.
export async function getRun(runId: string): Promise<Run> {
  if (runId === sample.id) return sample as Run;
  const run = await loadRun(runId);
  if (!run) notFound();
  return run;
}

export interface RunSummary {
  id: string;
  teamName: string;
  createdAt: string;
  score: number;
  delta: number;
  outcome: Outcome;
  percentile: number;
  weakestDistrict: DistrictId;
  reviewPassed: number;
  llmEnabled: boolean;
  isSample: boolean;
}

export function toSummary(run: Run, isSample = false): RunSummary {
  return {
    id: run.id,
    teamName: run.teamName,
    createdAt: run.createdAt,
    score: run.engine.score,
    delta: run.engine.delta,
    outcome: run.resolution.outcome,
    percentile: run.optimizer.percentile,
    weakestDistrict: run.engine.minDistrict.id,
    reviewPassed: run.reviews.at(-1)?.passed ?? 0,
    llmEnabled: run.llmEnabled,
    isSample,
  };
}

async function readStoredSummaries(): Promise<RunSummary[]> {
  const stored = await listStoredRuns();
  const summaries = await Promise.all(
    stored.map(async ({ id }) => {
      try {
        const run = await loadRun(id);
        return run ? toSummary(run) : null;
      } catch {
        return null; // unreadable or not a full Run: skip
      }
    }),
  );
  return summaries.filter((s): s is RunSummary => s !== null);
}

/** All stored runs, best Score first. Falls back to the fixture so the page is never blank in dev. */
export async function listRuns(): Promise<RunSummary[]> {
  const stored = await readStoredSummaries();
  const list = stored.length > 0 ? stored : [toSummary(sample as Run, true)];
  return list.sort((a, b) => b.score - a.score);
}
