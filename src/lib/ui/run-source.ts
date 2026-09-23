import type { Run } from "@/lib/types";
import sample from "../../../fixtures/sample-run.json";

// Temporary: serves the fixture for any runId; switches to the run store when the API (task A11) lands.
export async function getRun(runId: string): Promise<Run> {
  return { ...(sample as Run), id: runId };
}
