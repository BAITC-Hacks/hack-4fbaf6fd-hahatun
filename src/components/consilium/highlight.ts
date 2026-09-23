import type { ReviewCondition } from "@/lib/types";

export interface Segment {
  text: string;
  failures: ReviewCondition[];
}

export interface AnnotatedDraft {
  segments: Segment[];
  unmatched: ReviewCondition[]; // failed conditions not tied to any segment
}

const QUOTE_MARKS = /^[\s«»"“”„']+|[\s«»"“”„']+$/g;
const MIN_REVERSE_MATCH = 20;

export function stripQuoteMarks(quote: string): string {
  return quote.replace(QUOTE_MARKS, "");
}

function quoteVariants(quote: string): string[] {
  const base = quote.trim().toLocaleLowerCase("ru");
  const bare = stripQuoteMarks(base);
  const noPunct = bare.replace(/[.,;:!?…]+$/, "");
  return [...new Set([base, bare, noPunct])].filter((v) => v.length > 0);
}

// A segment matches when it contains the quote, or is itself part of a longer quote.
function matches(segment: string, quote: string): boolean {
  const s = segment.toLocaleLowerCase("ru");
  return quoteVariants(quote).some(
    (q) => s.includes(q) || (s.length >= MIN_REVERSE_MATCH && q.includes(s)),
  );
}

// Paragraphs by newlines; a single-paragraph text falls back to sentences.
function split(text: string): { parts: string[]; bySentence: boolean } {
  const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length > 1) return { parts: paragraphs, bySentence: false };
  const sentences = text
    .trim()
    .split(/(?<=[.!?…])\s+(?=[A-ZА-ЯЁ«"(])/u)
    .filter(Boolean);
  return { parts: sentences, bySentence: true };
}

// Glue neighbouring clean sentences back so the text still reads as prose.
function mergeClean(segments: Segment[]): Segment[] {
  const out: Segment[] = [];
  for (const seg of segments) {
    const prev = out.at(-1);
    if (prev && prev.failures.length === 0 && seg.failures.length === 0) {
      prev.text += ` ${seg.text}`;
    } else {
      out.push({ ...seg });
    }
  }
  return out;
}

export function annotateDraft(text: string, failed: ReviewCondition[]): AnnotatedDraft {
  const { parts, bySentence } = split(text);
  const raw = parts.map((part) => ({
    text: part,
    failures: failed.filter((c) => c.quote && matches(part, c.quote)),
  }));
  const hit = new Set(raw.flatMap((s) => s.failures.map((f) => f.id)));
  return {
    segments: bySentence ? mergeClean(raw) : raw,
    unmatched: failed.filter((c) => !hit.has(c.id)),
  };
}
