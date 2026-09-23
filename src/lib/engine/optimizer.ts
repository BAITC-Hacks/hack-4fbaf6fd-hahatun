import type { OptimizerResult, Scenario } from "@/lib/types";

// A5-lite: single-swap neighbours only (no full enumeration). Implemented by the optimizer agent.
export function optimize(scenario: Scenario): OptimizerResult {
  throw new Error(`not implemented: optimize(${scenario.decisions.length})`);
}
