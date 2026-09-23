// Shared contract between UI and backend. Change only via PR to main (see AGENTS.md).

export type Direction = "transport" | "ecology" | "social" | "safety" | "service";
export type Indicator = "T1" | "T2" | "E1" | "E2" | "S1" | "S2" | "B1" | "B2" | "C1" | "C2";
export type DistrictId = "esil" | "almaty" | "saryarka" | "baikonur" | "nura";
export type MeasureId =
  | "M1" | "M2" | "M3" | "M4" | "M5" | "M6" | "M7"
  | "M8" | "M9" | "M10" | "M11" | "M12" | "M13" | "M14";

export interface District {
  id: DistrictId;
  name: string;
  population: number; // share of city population, sums to 1
  profile: string;
  indicators: Record<Indicator, number>;
}

export interface Measure {
  id: MeasureId;
  direction: Direction;
  title: string;
  scope: "district" | "city";
  cost: number;
  lag: number; // quarters before the effect starts, horizon is 8
  effects: Partial<Record<Indicator, number>>;
}

export interface Synergy {
  pair: [MeasureId, MeasureId];
  indicator: Indicator;
  bonus: number; // applied in the district of the first measure, not scaled by lag
}

export interface Conflict {
  pair: [MeasureId, MeasureId];
  sameDistrictOnly: boolean;
  reason: string;
}

export interface Decision {
  measureId: MeasureId;
  districtId?: DistrictId;
}

export interface Scenario {
  decisions: Decision[]; // exactly 5
}

export type ValidationCode =
  | "COUNT"
  | "BUDGET"
  | "DUPLICATE"
  | "DISTRICT_REQUIRED"
  | "DISTRICT_FORBIDDEN"
  | "DIRECTION_CAP"
  | "CONFLICT";

export interface ValidationError {
  code: ValidationCode;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
  cost: number;
  remaining: number;
}

export interface DistrictResult {
  id: DistrictId;
  before: Record<Indicator, number>;
  after: Record<Indicator, number>;
  dBefore: number;
  dAfter: number;
}

export interface EngineResult {
  baseScore: number;
  score: number;
  delta: number;
  dAvg: number;
  minDistrict: { id: DistrictId; value: number };
  nCrit: number;
  criticals: { districtId: DistrictId; indicator: Indicator; value: number }[];
  districts: DistrictResult[];
  contributions: { measureId: MeasureId; delta: number }[]; // score(all) - score(all - m)
  synergies: string[];
}

export interface Improvement {
  scenario: Scenario;
  score: number;
  delta: number; // vs the user's score
  change: string; // human-readable, e.g. "M4 Есиль → M7 Нура"
}

export interface OptimizerResult {
  bestScore: number;
  bestScenario: Scenario;
  percentile: number; // 0..1, share of valid scenarios with score <= user's
  improvements: Improvement[]; // up to 3, each valid and better than the user's
}

export interface Fact {
  id: string; // F1, F2, ...
  text: string;
  value?: number;
  scope: Direction | "general";
}

export type ExpertRole = Direction | "finance";

export interface ExpertOpinion {
  role: ExpertRole;
  name: string;
  stance: "support" | "concern";
  summary: string;
  risk: string;
  tradeoff: string;
  factRefs: string[];
  suggestion?: Decision;
}

export interface Draft {
  version: number;
  strengths: string[];
  risks: string[];
  consequences: string[];
  recommendation: { improvement?: Improvement; text: string };
  text: string;
}

export type ConditionId = "C1" | "C2" | "C3" | "C4" | "C5" | "C6";

export interface ReviewCondition {
  id: ConditionId;
  by: "code" | "llm";
  passed: boolean;
  reason: string;
  quote?: string;
}

export interface Review {
  round: number;
  conditions: ReviewCondition[];
  passed: number;
  total: 6;
  ok: boolean;
}

export type Outcome = "approve" | "approve_with_conditions" | "return";

export interface Resolution {
  outcome: Outcome; // chosen by code, see plan.md §7
  disputes: { topic: string; sideTaken: ExpertRole; reason: string; factRefs: string[] }[];
  justification: string;
  mandates: { improvement: Improvement; text: string }[];
  caveat?: string;
}

export type Stage =
  | "validate"
  | "engine"
  | "optimize"
  | "experts"
  | "draft"
  | "review"
  | "arbiter"
  | "persist";

export type ConsiliumEvent =
  | { type: "stage"; stage: Stage; status: "start" | "done" | "error"; message?: string; runId?: string }
  | { type: "engine"; result: EngineResult; facts: Fact[] }
  | { type: "optimizer"; result: OptimizerResult }
  | { type: "expert"; opinion: ExpertOpinion }
  | { type: "draft"; draft: Draft }
  | { type: "review"; review: Review }
  | { type: "resolution"; resolution: Resolution }
  | { type: "done"; runId: string }
  | { type: "error"; message: string };

export interface RunUsage {
  calls: number;
  tokens: number;
  costUsd: number;
  durationMs: number;
  failedCalls?: number; // LLM calls that threw and were replaced by fallbacks
}

export interface Run {
  id: string;
  teamName: string;
  createdAt: string; // ISO 8601
  scenario: Scenario;
  engine: EngineResult;
  facts: Fact[];
  optimizer: OptimizerResult;
  opinions: ExpertOpinion[];
  drafts: Draft[];
  reviews: Review[];
  resolution: Resolution;
  llmEnabled: boolean;
  usage: RunUsage;
  /** Sandbox run on an imported dataset; absent for competition runs on the case data. */
  sandbox?: { datasetName: string; dataset: import("@/lib/dataset").Dataset };
}

// A14: an unexpected city event applied on top of a finished run (deterministic per run id).
export interface CityShock {
  districtId: DistrictId;
  indicator: Indicator;
  delta: number; // negative = damage, applied after measures, before clip
}
export interface CityEvent {
  id: string;
  title: string;
  text: string;
  shock: CityShock;
  scoreBefore: number; // run score
  scoreAfter: number; // same scenario under the shock
  nCritAfter: number;
  suggestion?: Improvement; // best single swap under the shock, if any beats scoreAfter
}

export const BUDGET = 100;
export const DECISIONS_COUNT = 5;
export const DIRECTION_CAP = 2;
export const HORIZON_QUARTERS = 8;
export const CRITICAL_THRESHOLD = 40;
export const REVIEW_PASS_THRESHOLD = 5;
export const REVIEW_MAX_ROUNDS = 2;

export const DIRECTION_LABELS: Record<Direction, string> = {
  transport: "Транспорт",
  ecology: "Экология",
  social: "Соцсфера",
  safety: "Безопасность",
  service: "Сервисы",
};

export const INDICATOR_LABELS: Record<Indicator, string> = {
  T1: "Разгрузка дорог",
  T2: "Доступность общественного транспорта",
  E1: "Озеленение",
  E2: "Качество воздуха",
  S1: "Школы и детсады",
  S2: "Поликлиники и первичная медпомощь",
  B1: "Безопасность улиц",
  B2: "Безопасность дорожного движения",
  C1: "Надёжность ЖКХ",
  C2: "Скорость решения обращений",
};

export const DISTRICT_LABELS: Record<DistrictId, string> = {
  esil: "Есиль",
  almaty: "Алматы",
  saryarka: "Сарыарка",
  baikonur: "Байконур",
  nura: "Нура",
};
