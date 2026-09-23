"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { Dataset } from "@/lib/dataset";
import { clearSandbox, parseSandboxRaw, readSandboxRaw, subscribeSandbox } from "@/lib/ui/sandbox";

/** Active sandbox dataset or null; null on the server and in the first client render (no hydration mismatch). */
export function useSandbox(): Dataset | null {
  const raw = useSyncExternalStore(subscribeSandbox, readSandboxRaw, () => null);
  const ds = useMemo(() => parseSandboxRaw(raw), [raw]);
  if (raw && !ds) queueMicrotask(clearSandbox);
  return ds;
}
