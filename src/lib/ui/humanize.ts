import type { Draft, ExpertOpinion, Fact, Improvement, MeasureId, Resolution, Review, Run } from "@/lib/types";
import { DISTRICT_LABELS } from "@/lib/types";
import { isDefaultDataset, type Dataset } from "@/lib/dataset";
import { DISTRICT_IN, MEASURE_SHORT } from "./labels";

// Players never see M1…M14: codes in validator, backend and LLM text become «short measure names».
const CODE_REF = /\bM(1[0-4]|[1-9])\b(?:\s*«[^»]*»)?/g; // "M5" or "M5 «Перевод…»" — the long title goes too
const CODE_JOIN = /\b(M(?:1[0-4]|[1-9]))\s*\+\s*(?=M(?:1[0-4]|[1-9])\b)/g; // "M10+M12" -> "M10 + M12"
const SENTENCE_START = /(^|[.!?]\s+)$/;
const SIDE = /^\s*M(1[0-4]|[1-9])\b(.*)$/;
const DISTRICT_BY_NAME = new Map(Object.entries(DISTRICT_LABELS).map(([id, name]) => [name, id as keyof typeof DISTRICT_IN]));

export type MeasureNames = Record<MeasureId, string>;

/** Short case names by default; an imported (sandbox) dataset speaks with its own measure titles. */
export function namesOf(ds?: Dataset): MeasureNames {
  if (!ds || isDefaultDataset(ds)) return MEASURE_SHORT;
  const names = { ...MEASURE_SHORT };
  for (const m of ds.measures) names[m.id] = m.title;
  return names;
}
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// A backend swap string embedded in LLM text: "M5 Сарыарка → M3 Линия ЛРТ / расширение, Нура".
const EMBEDDED_CHANGE =
  /\bM(?:1[0-4]|[1-9])\b[^→\n]{0,24}→\s*M(?:1[0-4]|[1-9])\b[^,.\n(]*(?:\(город\)|,\s*(?:Есиль|Алматы|Сарыарка|Байконур|Нура|город))?/g;

export function humanizeText(text: string, names: MeasureNames = MEASURE_SHORT): string {
  const short = (n: string) => names[`M${n}` as MeasureId];
  return text
    .replace(EMBEDDED_CHANGE, (match: string, offset: number, all: string) => {
      const change = humanizeChange(match, names);
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

function side(part: string, names: MeasureNames): string {
  const m = part.match(SIDE);
  return m ? `${names[`M${m[1]}` as MeasureId]} ${where(m[2])}` : humanizeText(part.trim(), names);
}

/** "M5 Сарыарка → M3 Линия ЛРТ / расширение, Нура" → "Чистое топливо в Сарыарке → линия ЛРТ в Нуре". */
export function humanizeChange(change: string, names: MeasureNames = MEASURE_SHORT): string {
  return capitalize(
    change
      .split("→")
      .map((part) => side(part, names))
      .join(" → "),
  );
}

function opinion(o: ExpertOpinion, n: MeasureNames): ExpertOpinion {
  return { ...o, summary: humanizeText(o.summary, n), risk: humanizeText(o.risk, n), tradeoff: humanizeText(o.tradeoff, n) };
}

const improvement = (i: Improvement, n: MeasureNames): Improvement => ({ ...i, change: humanizeChange(i.change, n) });
const texts = (xs: string[], n: MeasureNames) => xs.map((x) => humanizeText(x, n));

function draft(d: Draft, n: MeasureNames): Draft {
  const rec = d.recommendation;
  return {
    ...d,
    text: humanizeText(d.text, n),
    strengths: texts(d.strengths, n),
    risks: texts(d.risks, n),
    consequences: texts(d.consequences, n),
    recommendation: {
      text: humanizeText(rec.text, n),
      ...(rec.improvement ? { improvement: improvement(rec.improvement, n) } : {}),
    },
  };
}

function review(r: Review, n: MeasureNames): Review {
  return {
    ...r,
    conditions: r.conditions.map((c) => ({
      ...c,
      reason: humanizeText(c.reason, n),
      ...(c.quote ? { quote: humanizeText(c.quote, n) } : {}),
    })),
  };
}

function resolution(r: Resolution, n: MeasureNames): Resolution {
  return {
    ...r,
    justification: humanizeText(r.justification, n),
    disputes: r.disputes.map((d) => ({ ...d, topic: humanizeText(d.topic, n), reason: humanizeText(d.reason, n) })),
    mandates: r.mandates.map((m) => ({ text: humanizeText(m.text, n), improvement: improvement(m.improvement, n) })),
    ...(r.caveat ? { caveat: humanizeText(r.caveat, n) } : {}),
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
export function humanizeParts<T extends ConsiliumParts>(p: T, n: MeasureNames = MEASURE_SHORT): T {
  return {
    ...p,
    opinions: p.opinions.map((o) => opinion(o, n)),
    drafts: p.drafts.map((d) => draft(d, n)),
    reviews: p.reviews.map((r) => review(r, n)),
    facts: p.facts.map((f) => ({ ...f, text: humanizeText(f.text, n) })),
    ...(p.resolution ? { resolution: resolution(p.resolution, n) } : {}),
  };
}

/** A sandbox run keeps its own dataset's measure titles; a case run gets the short names. */
export function humanizeRun(run: Run): Run {
  const n = namesOf(run.sandbox?.dataset);
  return {
    ...humanizeParts(run, n),
    engine: { ...run.engine, synergies: texts(run.engine.synergies, n) },
    optimizer: { ...run.optimizer, improvements: run.optimizer.improvements.map((i) => improvement(i, n)) },
  };
}
