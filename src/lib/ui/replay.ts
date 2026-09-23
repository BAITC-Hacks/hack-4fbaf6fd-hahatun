import type { ConsiliumEvent, Run, Stage } from "@/lib/types";

// Demo replay: rebuilds the event stream the pipeline would emit for a finished Run,
// so the live screen works before the SSE backend exists and with ?replay=1 on stage.

function staged(stage: Stage, payload: ConsiliumEvent[]): ConsiliumEvent[] {
  return [
    { type: "stage", stage, status: "start" },
    ...payload,
    { type: "stage", stage, status: "done" },
  ];
}

function revisionRounds(run: Run): ConsiliumEvent[] {
  const drafts = [...run.drafts].sort((a, b) => a.version - b.version);
  return drafts.flatMap((draft, i) => {
    const review = run.reviews.find((r) => r.round === draft.version) ?? run.reviews[i];
    return [
      ...staged("draft", [{ type: "draft", draft }]),
      ...(review ? staged("review", [{ type: "review", review }]) : []),
    ];
  });
}

/** Event sequence in pipeline order: validate → engine → optimize → experts → draft/review → arbiter → persist. */
export function fixtureEvents(run: Run): ConsiliumEvent[] {
  return [
    ...staged("validate", []),
    ...staged("engine", [{ type: "engine", result: run.engine, facts: run.facts }]),
    ...staged("optimize", [{ type: "optimizer", result: run.optimizer }]),
    ...staged(
      "experts",
      run.opinions.map((opinion) => ({ type: "expert" as const, opinion })),
    ),
    ...revisionRounds(run),
    ...staged("arbiter", [{ type: "resolution", resolution: run.resolution }]),
    ...staged("persist", []),
    { type: "done", runId: run.id },
  ];
}

function delayFor(event: ConsiliumEvent, delayMs: number): number {
  if (event.type === "stage" && event.status === "start") return 0; // next stage starts right away
  if (event.type === "expert") return Math.round(delayMs * 0.4); // experts answer in parallel
  if (event.type === "stage") return Math.round(delayMs / 2);
  return delayMs;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (ms <= 0 || signal?.aborted) return resolve();
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal?.addEventListener("abort", finish, { once: true });
  });
}

/** Yields events with stage-like pauses; stops quietly when the signal aborts. */
export async function* replayEvents(
  events: ConsiliumEvent[],
  delayMs = 600,
  signal?: AbortSignal,
): AsyncGenerator<ConsiliumEvent> {
  for (const event of events) {
    await sleep(delayFor(event, delayMs), signal);
    if (signal?.aborted) return;
    yield event;
  }
}
