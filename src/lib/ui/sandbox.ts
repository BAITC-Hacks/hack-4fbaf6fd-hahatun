import { parseDataset, type Dataset } from "@/lib/dataset";

// Imported sandbox dataset lives in sessionStorage: this tab only, never leaves the browser until a run is sent.
const KEY = "akim.sandbox";
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) l();
}

/** Raw stored value, stable between calls: the snapshot for useSyncExternalStore. */
export function readSandboxRaw(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null; // server render, private mode or blocked storage
  }
}

export function parseSandboxRaw(raw: string | null): Dataset | null {
  if (!raw) return null;
  try {
    const parsed = parseDataset(JSON.parse(raw));
    return parsed.ok ? parsed.dataset : null;
  } catch {
    return null;
  }
}

export function getSandbox(): Dataset | null {
  const raw = readSandboxRaw();
  const ds = parseSandboxRaw(raw);
  if (raw && !ds) clearSandbox(); // broken value: drop it, the case data takes over
  return ds;
}

export function setSandbox(ds: Dataset): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(ds));
  } catch {
    // Storage unavailable: the cabinet stays on the case data.
  }
  notify();
}

export function clearSandbox(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
  notify();
}

export function subscribeSandbox(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
