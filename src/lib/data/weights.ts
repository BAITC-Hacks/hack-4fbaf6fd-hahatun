import type { Direction, Indicator } from "@/lib/types";

// Source: docs/source/dataset.md §3. Sum of weights = 1.
export const WEIGHTS: Record<Indicator, number> = {
  T1: 0.1, T2: 0.1, E1: 0.09, E2: 0.11, S1: 0.11, S2: 0.11, B1: 0.09, B2: 0.09, C1: 0.1, C2: 0.1,
};

export const INDICATORS: Indicator[] = ["T1", "T2", "E1", "E2", "S1", "S2", "B1", "B2", "C1", "C2"];

export const INDICATOR_DIRECTION: Record<Indicator, Direction> = {
  T1: "transport", T2: "transport", E1: "ecology", E2: "ecology", S1: "social", S2: "social",
  B1: "safety", B2: "safety", C1: "service", C2: "service",
};

export const SCORE_WEIGHTS = { cityAverage: 0.7, weakestDistrict: 0.3, criticalPenalty: 1.0 } as const;
