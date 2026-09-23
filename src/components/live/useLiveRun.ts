import { useCallback, useEffect, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import sample from "../../../fixtures/sample-run.json";
import type { ConsiliumEvent, Run } from "@/lib/types";
import { clearPendingRun, readPendingRun, type PendingRun } from "@/lib/ui/pending-run";
import { fixtureEvents, replayEvents } from "@/lib/ui/replay";
import { EMPTY_LIVE_RUN, reduceLiveRun, RunRequestError, streamRun, type LiveRun } from "@/lib/ui/run-stream";

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
  if (run.error) return "error"; // stage-level errors (e.g. optimizer) are shown in the stage list, not fatal
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
  } catch (err) {
    if (signal.aborted) return null;
    // API missing or unreachable before the first event: show the demo run instead
    const unreachable = err instanceof RunRequestError && (err.status === 0 || err.status === 404 || err.status >= 502);
    if (received === 0 && unreachable) return "fallback" as const;
    // anything else (400 validation, 500) is a real error and must be shown as such
    dispatch({ type: "event", event: { type: "error", message: err instanceof Error ? err.message : String(err) } });
    return null;
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

const RECOVER_INTERVAL_MS = 3000;
const RECOVER_ATTEMPTS = 30;

/** After an SSE drop the server keeps running; poll GET /api/runs/:id until the run is saved. */
async function recoverRun(id: string, signal: AbortSignal, dispatch: Dispatch) {
  for (let i = 0; i < RECOVER_ATTEMPTS && !signal.aborted; i += 1) {
    await new Promise((r) => setTimeout(r, RECOVER_INTERVAL_MS));
    try {
      const res = await fetch(`/api/runs/${encodeURIComponent(id)}`, { signal });
      if (res.ok) {
        const run = (await res.json()) as Run;
        if (run.resolution) dispatch({ type: "event", event: { type: "resolution", resolution: run.resolution } });
        dispatch({ type: "event", event: { type: "done", runId: run.id } });
        return;
      }
    } catch {
      if (signal.aborted) return;
    }
  }
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

  const { runId, startedId } = state.run;
  const { mode, phase } = state;
  const status = statusOf(state);

  useEffect(() => {
    if (status !== "dropped" || !startedId || mode !== "server") return;
    const controller = new AbortController();
    void recoverRun(startedId, controller.signal, dispatch);
    return () => controller.abort();
  }, [status, startedId, mode]);

  useEffect(() => {
    if (!runId) return;
    if (mode === "server") clearPendingRun();
    const timer = setTimeout(() => router.replace(`/result/${encodeURIComponent(runId)}`), REDIRECT_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [runId, mode, router]);

  const restart = useCallback(() => setAttempt((n) => n + 1), []);
  void phase;
  return { status, mode, run: state.run, restart };
}
