import { useCallback, useEffect, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import sample from "../../../fixtures/sample-run.json";
import type { ConsiliumEvent, Run } from "@/lib/types";
import { clearPendingRun, readPendingRun, type PendingRun } from "@/lib/ui/pending-run";
import { fixtureEvents, replayEvents } from "@/lib/ui/replay";
import { EMPTY_LIVE_RUN, reduceLiveRun, streamRun, type LiveRun } from "@/lib/ui/run-stream";

/** server: real SSE; fallback: API unreachable, fixture replay; replay: ?replay=1 demo. */
export type LiveMode = "server" | "fallback" | "replay";
export type LiveStatus = "loading" | "missing" | "running" | "done" | "error" | "dropped";

interface State {
  phase: "loading" | "missing" | "streaming" | "ended";
  mode: LiveMode;
  run: LiveRun;
}

type Action =
  | { type: "missing" }
  | { type: "reset"; mode: LiveMode }
  | { type: "event"; event: ConsiliumEvent }
  | { type: "ended" };

const INITIAL: State = { phase: "loading", mode: "server", run: EMPTY_LIVE_RUN };
const REDIRECT_PAUSE_MS = 800;
const REPLAY_DELAY_MS = 600;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "missing":
      return { ...state, phase: "missing" };
    case "reset":
      return { phase: "streaming", mode: action.mode, run: EMPTY_LIVE_RUN };
    case "event":
      return { ...state, run: reduceLiveRun(state.run, action.event) };
    case "ended":
      return { ...state, phase: "ended" };
  }
}

function statusOf({ phase, run }: State): LiveStatus {
  if (phase === "loading" || phase === "missing") return phase;
  if (run.error || Object.values(run.stages).includes("error")) return "error";
  if (run.runId) return "done";
  return phase === "ended" ? "dropped" : "running";
}

type Dispatch = (action: Action) => void;

/** Streams from /api/run; returns the mode to replay with if the server never answered. */
async function streamFromServer(pending: PendingRun, signal: AbortSignal, dispatch: Dispatch) {
  let received = 0;
  try {
    for await (const event of streamRun(pending, signal)) {
      received += 1;
      dispatch({ type: "event", event });
    }
    return null;
  } catch {
    // before the first event: API missing or down, show the demo run instead
    return received === 0 && !signal.aborted ? ("fallback" as const) : null;
  }
}

async function runConsilium(signal: AbortSignal, dispatch: Dispatch) {
  const replay = new URLSearchParams(window.location.search).get("replay") === "1";
  const pending = readPendingRun();
  if (!replay && !pending) return dispatch({ type: "missing" });

  let mode: LiveMode = replay ? "replay" : "server";
  dispatch({ type: "reset", mode });
  if (pending && !replay) {
    const fallback = await streamFromServer(pending, signal, dispatch);
    if (fallback) dispatch({ type: "reset", mode: (mode = fallback) });
  }
  if (mode !== "server") {
    for await (const event of replayEvents(fixtureEvents(sample as Run), REPLAY_DELAY_MS, signal)) {
      dispatch({ type: "event", event });
    }
  }
  if (!signal.aborted) dispatch({ type: "ended" });
}

export function useLiveRun() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    // Deferred start: strict mode's mount-unmount-mount clears this timer, so only one POST goes out.
    const timer = setTimeout(() => void runConsilium(controller.signal, dispatch), 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [attempt]);

  const { runId } = state.run;
  const { mode } = state;
  useEffect(() => {
    if (!runId) return;
    if (mode !== "replay") clearPendingRun();
    const timer = setTimeout(() => router.replace(`/result/${encodeURIComponent(runId)}`), REDIRECT_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [runId, mode, router]);

  const restart = useCallback(() => setAttempt((n) => n + 1), []);
  return { status: statusOf(state), mode, run: state.run, restart };
}
