import type {
  ConsiliumEvent,
  Draft,
  EngineResult,
  ExpertOpinion,
  Fact,
  OptimizerResult,
  Resolution,
  Review,
  Scenario,
  Stage,
} from "@/lib/types";

export type StageStatus = "start" | "done" | "error";

/** Partial run assembled from the event stream; the same shape serves live view and replay. */
export interface LiveRun {
  stages: Partial<Record<Stage, StageStatus>>;
  engine?: EngineResult;
  facts: Fact[];
  optimizer?: OptimizerResult;
  opinions: ExpertOpinion[];
  drafts: Draft[];
  reviews: Review[];
  resolution?: Resolution;
  runId?: string;
  error?: string;
}

export const EMPTY_LIVE_RUN: LiveRun = { stages: {}, facts: [], opinions: [], drafts: [], reviews: [] };

export function reduceLiveRun(state: LiveRun, event: ConsiliumEvent): LiveRun {
  switch (event.type) {
    case "stage":
      return { ...state, stages: { ...state.stages, [event.stage]: event.status } };
    case "engine":
      return { ...state, engine: event.result, facts: event.facts };
    case "optimizer":
      return { ...state, optimizer: event.result };
    case "expert":
      return { ...state, opinions: [...state.opinions.filter((o) => o.role !== event.opinion.role), event.opinion] };
    case "draft":
      return { ...state, drafts: [...state.drafts, event.draft] };
    case "review":
      return { ...state, reviews: [...state.reviews, event.review] };
    case "resolution":
      return { ...state, resolution: event.resolution };
    case "done":
      return { ...state, runId: event.runId };
    case "error":
      return { ...state, error: event.message };
    default:
      return state; // unknown events must not break the screen
  }
}

/** Splits an SSE buffer into complete `data:` events; returns the unfinished tail. */
export function parseSse(buffer: string): { events: ConsiliumEvent[]; rest: string } {
  const blocks = buffer.replace(/\r\n/g, "\n").split("\n\n");
  const rest = blocks.pop() ?? "";
  const events: ConsiliumEvent[] = [];
  for (const block of blocks) {
    const data = block
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data) continue;
    try {
      events.push(JSON.parse(data) as ConsiliumEvent);
    } catch {
      events.push({ type: "error", message: "Сервер прислал повреждённое событие" });
    }
  }
  return { events, rest };
}

/** POST /api/run and yield events as they arrive (EventSource cannot POST). */
export async function* streamRun(
  body: { teamName: string; scenario: Scenario },
  signal?: AbortSignal,
): AsyncGenerator<ConsiliumEvent> {
  const res = await fetch("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`Консилиум не запустился: HTTP ${res.status}`);
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const parsed = parseSse(buffer + value);
    buffer = parsed.rest;
    yield* parsed.events;
  }
}
