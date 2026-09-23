import { notFound } from "next/navigation";
import type { Run } from "@/lib/types";
import { loadRun } from "@/lib/store/runs";
import sample from "../../../fixtures/sample-run.json";

// Server-only: pages read saved runs from the store; the fixture id keeps the ?replay=1 demo working.
export async function getRun(runId: string): Promise<Run> {
  if (runId === sample.id) return sample as Run;
  const run = await loadRun(runId);
  if (!run) notFound();
  return run;
}
