import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { DistrictId, Outcome, Run } from "@/lib/types";
import sample from "../../../fixtures/sample-run.json";

// Storage format follows task A11: one JSON file per Run in data/runs/.
const RUNS_DIR = path.join(process.cwd(), "data", "runs");

// Temporary: serves the fixture for any runId; switches to the run store when the API (task A11) lands.
export async function getRun(runId: string): Promise<Run> {
  return { ...(sample as Run), id: runId };
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
  let files: string[];
  try {
    files = await readdir(RUNS_DIR);
  } catch {
    return [];
  }
  const summaries = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        try {
          return toSummary(JSON.parse(await readFile(path.join(RUNS_DIR, f), "utf8")) as Run);
        } catch {
          return null; // unreadable or not a Run: skip
        }
      }),
  );
  return summaries.filter((s) => s !== null);
}

/** All stored runs, best Score first. Falls back to the fixture so the page is never blank in dev. */
export async function listRuns(): Promise<RunSummary[]> {
  const stored = await readStoredSummaries();
  const list = stored.length > 0 ? stored : [toSummary(sample as Run, true)];
  return list.sort((a, b) => b.score - a.score);
}
