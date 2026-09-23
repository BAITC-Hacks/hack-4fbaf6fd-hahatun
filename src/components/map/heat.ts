// Heat scale for district D. Fixed domain so before/after maps are comparable.
export const HEAT_MIN = 45;
export const HEAT_MAX = 65;

// Share of the heat colour over the card: pale enough for ink labels to keep ≥ 4.5:1.
const STRENGTH = 38;

/** Position of D on the scale, clamped to 0..1. */
export function heatShare(d: number): number {
  return Math.min(1, Math.max(0, (d - HEAT_MIN) / (HEAT_MAX - HEAT_MIN)));
}

/** CSS colour for D: return → conditions → approve tokens, mixed into the card. */
export function heatColor(d: number): string {
  const t = heatShare(d);
  const [from, to, p] =
    t < 0.5 ? ["--outcome-return", "--outcome-conditions", t * 2] : ["--outcome-conditions", "--outcome-approve", t * 2 - 1];
  const hue = `color-mix(in oklch, var(${to}) ${Math.round(p * 100)}%, var(${from}))`;
  return `color-mix(in oklch, ${hue} ${STRENGTH}%, var(--card))`;
}
