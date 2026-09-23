import type { ExpertRole, Outcome, Stage } from "@/lib/types";
import { DIRECTION_LABELS } from "@/lib/types";

export const OUTCOME_LABELS: Record<Outcome, string> = {
  approve: "Утвердить",
  approve_with_conditions: "Утвердить с условиями",
  return: "Вернуть на доработку",
};

// Tailwind classes per outcome, backed by --outcome-* tokens in globals.css.
export const OUTCOME_TONE: Record<Outcome, { text: string; border: string; bg: string }> = {
  approve: { text: "text-outcome-approve", border: "border-outcome-approve", bg: "bg-outcome-approve" },
  approve_with_conditions: {
    text: "text-outcome-conditions",
    border: "border-outcome-conditions",
    bg: "bg-outcome-conditions",
  },
  return: { text: "text-outcome-return", border: "border-outcome-return", bg: "bg-outcome-return" },
};

export const ROLE_LABELS: Record<ExpertRole, string> = {
  ...DIRECTION_LABELS,
  finance: "Финансы",
};

export const STAGE_LABELS: Record<Stage, string> = {
  validate: "Проверка правил",
  engine: "Расчёт Score",
  optimize: "Поиск лучших наборов",
  experts: "Мнения экспертов",
  draft: "Черновик заключения",
  review: "Ревизия черновика",
  arbiter: "Резолюция арбитра",
  persist: "Сохранение прогона",
};
