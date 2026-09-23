import type { Draft, ExpertOpinion, Fact, Improvement, MeasureId, Resolution, Review, Run } from "@/lib/types";
import { DISTRICT_LABELS } from "@/lib/types";
import { DISTRICT_IN, MEASURE_SHORT } from "./labels";

// Players never see M1…M14: codes in validator, backend and LLM text become «short measure names».
const CODE_REF = /\bM(1[0-4]|[1-9])\b(?:\s*«[^»]*»)?/g; // "M5" or "M5 «Перевод…»" — the long title goes too
const CODE_JOIN = /\b(M(?:1[0-4]|[1-9]))\s*\+\s*(?=M(?:1[0-4]|[1-9])\b)/g; // "M10+M12" -> "M10 + M12"
const SENTENCE_START = /(^|[.!?]\s+)$/;
const SIDE = /^\s*M(1[0-4]|[1-9])\b(.*)$/;
const DISTRICT_BY_NAME = new Map(Object.entries(DISTRICT_LABELS).map(([id, name]) => [name, id as keyof typeof DISTRICT_IN]));

const short = (n: string) => MEASURE_SHORT[`M${n}` as MeasureId];
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// A backend swap string embedded in LLM text: "M5 Сарыарка → M3 Линия ЛРТ / расширение, Нура".
const EMBEDDED_CHANGE =
  /\bM(?:1[0-4]|[1-9])\b[^→\n]{0,24}→\s*M(?:1[0-4]|[1-9])\b[^,.\n(]*(?:\(город\)|,\s*(?:Есиль|Алматы|Сарыарка|Байконур|Нура|город))?/g;

export function humanizeText(text: string): string {
  return text
    .replace(EMBEDDED_CHANGE, (match: string, offset: number, all: string) => {
      const change = humanizeChange(match);
      return SENTENCE_START.test(all.slice(0, offset)) ? change : change.charAt(0).toLowerCase() + change.slice(1);
    })
    .replace(CODE_JOIN, "$1 + ")
    .replace(CODE_REF, (_, n: string, offset: number, all: string) => {
    const name = short(n);
    return `«${SENTENCE_START.test(all.slice(0, offset)) ? capitalize(name) : name}»`;
  });
}

function where(rest: string): string {
  const tail = rest.replace(/\(город\)\s*$/, ", город").split(",").pop()?.trim() ?? "";
  if (tail === "" || tail === "город") return "на весь город";
  const id = DISTRICT_BY_NAME.get(tail);
  return id ? DISTRICT_IN[id] : tail;
}

function side(part: string): string {
  const m = part.match(SIDE);
  return m ? `${short(m[1])} ${where(m[2])}` : humanizeText(part.trim());
}

/** "M5 Сарыарка → M3 Линия ЛРТ / расширение, Нура" → "Чистое топливо в Сарыарке → линия ЛРТ в Нуре". */
export function humanizeChange(change: string): string {
  return capitalize(change.split("→").map(side).join(" → "));
}

const improvement = (i: Improvement): Improvement => ({ ...i, change: humanizeChange(i.change) });
const texts = (xs: string[]) => xs.map(humanizeText);

function opinion(o: ExpertOpinion): ExpertOpinion {
  return { ...o, summary: humanizeText(o.summary), risk: humanizeText(o.risk), tradeoff: humanizeText(o.tradeoff) };
}

function draft(d: Draft): Draft {
  const rec = d.recommendation;
  return {
    ...d,
    text: humanizeText(d.text),
    strengths: texts(d.strengths),
    risks: texts(d.risks),
    consequences: texts(d.consequences),
    recommendation: { text: humanizeText(rec.text), ...(rec.improvement ? { improvement: improvement(rec.improvement) } : {}) },
  };
}

function review(r: Review): Review {
  return {
    ...r,
    conditions: r.conditions.map((c) => ({
      ...c,
      reason: humanizeText(c.reason),
      ...(c.quote ? { quote: humanizeText(c.quote) } : {}),
    })),
  };
}

function resolution(r: Resolution): Resolution {
  return {
    ...r,
    justification: humanizeText(r.justification),
    disputes: r.disputes.map((d) => ({ ...d, topic: humanizeText(d.topic), reason: humanizeText(d.reason) })),
    mandates: r.mandates.map((m) => ({ text: humanizeText(m.text), improvement: improvement(m.improvement) })),
    ...(r.caveat ? { caveat: humanizeText(r.caveat) } : {}),
  };
}

interface ConsiliumParts {
  opinions: ExpertOpinion[];
  drafts: Draft[];
  reviews: Review[];
  facts: Fact[];
  resolution?: Resolution;
}

/** The consilium texts of a full run or of a live partial run. */
export function humanizeParts<T extends ConsiliumParts>(p: T): T {
  return {
    ...p,
    opinions: p.opinions.map(opinion),
    drafts: p.drafts.map(draft),
    reviews: p.reviews.map(review),
    facts: p.facts.map((f) => ({ ...f, text: humanizeText(f.text) })),
    ...(p.resolution ? { resolution: resolution(p.resolution) } : {}),
  };
}

export function humanizeRun(run: Run): Run {
  const parts = humanizeParts(run);
  return {
    ...parts,
    engine: { ...run.engine, synergies: texts(run.engine.synergies) },
    optimizer: { ...run.optimizer, improvements: run.optimizer.improvements.map(improvement) },
  };
}
