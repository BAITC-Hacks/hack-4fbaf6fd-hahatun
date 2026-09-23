import type { Dataset } from "@/lib/dataset";
import type { Scenario } from "@/lib/types";

// Hand-off from /play to /result/live: the stream can only start on the page that shows it.
const KEY = "akim.pendingRun";

export interface PendingRun {
  teamName: string;
  scenario: Scenario;
  dataset?: Dataset; // sandbox only; absent = case data
}

export function savePendingRun(run: PendingRun): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(run));
  } catch {
    // storage unavailable (private mode): the live page will show how to restart
  }
}

export function readPendingRun(): PendingRun | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingRun) : null;
  } catch {
    return null;
  }
}

export function clearPendingRun(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}
