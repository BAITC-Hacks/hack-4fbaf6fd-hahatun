// Heat scale for district D. Fixed domain so before/after maps are comparable.
export const HEAT_MIN = 45;
export const HEAT_MAX = 65;

// Share of the end colour at the extremes: pale enough for ink labels to keep ≥ 4.5:1.
const STRENGTH = 42;

/** Position of D on the scale, clamped to 0..1. */
export function heatShare(d: number): number {
  return Math.min(1, Math.max(0, (d - HEAT_MIN) / (HEAT_MAX - HEAT_MIN)));
}

/** CSS colour for D, diverging: clay (--outcome-return) → paper-neutral (--muted) → sky. */
export function heatColor(d: number): string {
  const t = heatShare(d);
  const end = t < 0.5 ? "--outcome-return" : "--sky";
  const share = Math.round(Math.abs(t - 0.5) * 2 * STRENGTH);
  return `color-mix(in oklch, var(${end}) ${share}%, var(--muted))`;
}
