import type { Fact } from "@/lib/types";

// Number extraction for reviewer C1: every number in the draft must come from the facts.

export interface NumberToken {
  raw: string; // as written in the text, e.g. "−1.2", "43,75", "95%"
  value: number;
  decimals: number; // digits after the decimal separator as written
}

export const NUMBER_TOLERANCE = 0.011;

// Sign is only a sign when not glued to a preceding letter/digit ("2-3" is a range, not -3).
// Digits glued to letters are identifiers (M7, F12, S1, T2) or parts of words and are skipped.
const NUMBER_RE = /(?<![\p{L}\p{N}_.,№])([-−–+](?=\d))?(\d+(?:[.,]\d+)?)(%)?(?![\p{L}\p{N}_]|[.,]\d)/gu;
const YEAR_RE = /^20\d\d$/;

export function extractNumbers(text: string): NumberToken[] {
  const normalized = text.replace(/№\s+/g, "№");
  const out: NumberToken[] = [];
  for (const m of normalized.matchAll(NUMBER_RE)) {
    const [raw, sign, digits] = m;
    if (!sign && YEAR_RE.test(digits)) continue;
    const abs = Number(digits.replace(",", "."));
    if (!Number.isFinite(abs)) continue;
    const sep = digits.search(/[.,]/);
    out.push({ raw, value: sign && sign !== "+" ? -abs : abs, decimals: sep === -1 ? 0 : digits.length - sep - 1 });
  }
  return out;
}

// Allowed = every fact.value plus every number written in the fact texts.
export function allowedNumbers(facts: Fact[]): number[] {
  const set = new Set<number>();
  for (const f of facts) {
    if (f.value !== undefined && Number.isFinite(f.value)) set.add(f.value);
    for (const t of extractNumbers(f.text)) set.add(t.value);
  }
  return [...set];
}

const roundTo = (x: number, d: number) => {
  const k = 10 ** d;
  return Math.round(x * k + 1e-9) / k;
};

// Signs are compared by magnitude: "снизился на 1.2" is a fair reading of the fact "−1.2".
// A number written with fewer decimals matches the fact rounded to that precision (43.8 ~ 43.75, 48 ~ 48.0).
export function isAllowed(token: NumberToken, allowed: number[]): boolean {
  const x = Math.abs(token.value);
  return allowed.some((a) => {
    const y = Math.abs(a);
    if (Math.abs(x - y) <= NUMBER_TOLERANCE) return true;
    return token.decimals <= 1 && Math.abs(roundTo(y, token.decimals) - x) <= 1e-9;
  });
}

export function foreignNumbers(text: string, allowed: number[]): NumberToken[] {
  return extractNumbers(text).filter((t) => !isAllowed(t, allowed));
}

export function sentenceWith(text: string, raw: string): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  return (sentences.find((s) => s.includes(raw)) ?? text).trim();
}
