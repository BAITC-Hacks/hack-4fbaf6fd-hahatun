import type { ConditionId, Draft, Review } from "@/lib/types";
import { REVIEW_PASS_THRESHOLD } from "@/lib/types";

// What each reviewer condition checks, see plan.md §7.
export const CONDITION_LABELS: Record<ConditionId, string> = {
  C1: "Каждое число в тексте есть среди фактов движка",
  C2: "Рекомендованный набор валиден и лучше текущего",
  C3: "Назван слабейший район и объяснено почему",
  C4: "У каждой из пяти мер описан эффект",
  C5: "Есть риск и компромисс с причиной",
  C6: "Нет утверждений о механизмах вне датасета",
};

export const REVIEWER_LABELS = {
  code: { label: "код", className: "text-by-code" },
  llm: { label: "ревизор", className: "text-by-llm" },
} as const;

/** Round N reviews draft version N. */
export function reviewForDraft(draft: Draft, reviews: Review[]): Review | undefined {
  return reviews.find((r) => r.round === draft.version);
}

export function roundSummary(review: Review): { text: string; passed: boolean } {
  const passed = review.passed >= REVIEW_PASS_THRESHOLD;
  const text = passed
    ? `${review.passed} из ${review.total}, порог пройден`
    : `${review.passed} из ${review.total} — на пересмотр`;
  return { text, passed };
}
