// Single place for rounding: engine keeps raw numbers, UI rounds only here.
const MINUS = "−";

function trim(n: number, digits: number): string {
  return Number(n.toFixed(digits)).toString();
}

/** Score and district D: always two decimals, e.g. 56.54. */
export function formatScore(n: number): string {
  return n.toFixed(2);
}

/** Signed change with a real minus sign: +3.98, −0.5, 0. */
export function formatDelta(n: number, digits = 2): string {
  const rounded = Number(n.toFixed(digits));
  if (rounded === 0) return "0";
  const body = trim(Math.abs(rounded), digits);
  return rounded > 0 ? `+${body}` : `${MINUS}${body}`;
}

/** Indicator value 0..100 without trailing zeros: 48, 43.75. */
export function formatValue(n: number, digits = 2): string {
  return trim(n, digits);
}

/** Budget units: "95 у.е.". */
export function formatCost(n: number): string {
  return `${trim(n, 0)} у.е.`;
}

/** Share 0..1 as a whole percent: 0.91 → "91%". */
export function formatPercent(share: number): string {
  return `${Math.round(share * 100)}%`;
}

export type Trend = "up" | "down" | "flat";

export function trendOf(delta: number, epsilon = 0.005): Trend {
  if (delta > epsilon) return "up";
  if (delta < -epsilon) return "down";
  return "flat";
}
