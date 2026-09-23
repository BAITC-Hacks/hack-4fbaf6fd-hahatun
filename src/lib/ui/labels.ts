import type { DistrictId, ExpertRole, Indicator, MeasureId, Outcome, Stage } from "@/lib/types";
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

// Short measure names for running text instead of M1…M14 codes.
export const MEASURE_SHORT: Record<MeasureId, string> = {
  M1: "автобусные полосы",
  M2: "умные светофоры",
  M3: "линия ЛРТ",
  M4: "парк",
  M5: "чистое топливо",
  M6: "озеленение города",
  M7: "школа и детсад",
  M8: "поликлиника",
  M9: "спорт-хабы",
  M10: "освещение и камеры",
  M11: "безопасные переходы",
  M12: "цифровая платформа обращений",
  M13: "модернизация сетей",
  M14: "аварийные бригады ЖКХ",
};

// "в каком районе": prepositional case for sentences.
export const DISTRICT_IN: Record<DistrictId, string> = {
  esil: "в Есиле",
  almaty: "в Алматы",
  saryarka: "в Сарыарке",
  baikonur: "в Байконуре",
  nura: "в Нуре",
};
