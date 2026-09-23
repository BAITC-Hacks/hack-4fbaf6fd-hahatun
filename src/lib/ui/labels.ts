import type { ExpertRole, Indicator, Outcome, Stage } from "@/lib/types";
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

// Short "+N к …" phrasing for the cabinet: «+16 к школам и детсадам».
export const EFFECT_LABELS: Record<Indicator, string> = {
  T1: "к разгрузке дорог",
  T2: "к общественному транспорту",
  E1: "к озеленению",
  E2: "к качеству воздуха",
  S1: "к школам и детсадам",
  S2: "к поликлиникам",
  B1: "к безопасности улиц",
  B2: "к безопасности на дорогах",
  C1: "к надёжности ЖКХ",
  C2: "к скорости обращений",
};
