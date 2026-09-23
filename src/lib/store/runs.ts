import type { Run } from "@/lib/types";

// JSON files in data/runs/<id>.json. Implemented by the pipeline agent.
export async function saveRun(run: Run): Promise<void> {
  throw new Error(`not implemented: saveRun(${run.id})`);
}
export async function loadRun(id: string): Promise<Run | null> {
  throw new Error(`not implemented: loadRun(${id})`);
}
export async function listRuns(): Promise<Pick<Run, "id" | "teamName" | "createdAt">[]> {
  throw new Error("not implemented: listRuns");
}
