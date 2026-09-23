import type { Conflict, Synergy } from "@/lib/types";

// Source: docs/source/dataset.md §2. Bonus lands in the district of the first measure and ignores lag.
export const SYNERGIES: Synergy[] = [
  { pair: ["M1", "M2"], indicator: "T1", bonus: 2 },
  { pair: ["M10", "M12"], indicator: "B1", bonus: 2 },
  { pair: ["M5", "M6"], indicator: "E2", bonus: 2 },
];

export const CONFLICTS: Conflict[] = [
  { pair: ["M1", "M3"], sameDistrictOnly: false, reason: "Либо BRT, либо ЛРТ, в любом районе" },
  { pair: ["M4", "M7"], sameDistrictOnly: true, reason: "Конфликт за участок в одном районе" },
  { pair: ["M5", "M13"], sameDistrictOnly: true, reason: "Дублирование программы в одном районе" },
];
