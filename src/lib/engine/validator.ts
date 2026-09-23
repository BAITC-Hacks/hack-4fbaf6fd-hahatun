import { DEFAULT_DATASET, type Dataset } from "@/lib/dataset";
import { measureIndex } from "./engine";
import {
  BUDGET,
  DECISIONS_COUNT,
  DIRECTION_CAP,
  DIRECTION_LABELS,
  DISTRICT_LABELS,
  type Direction,
  type Scenario,
  type ValidationError,
  type ValidationResult,
} from "@/lib/types";

// Rules from docs/source/dataset.md §4. Returns every violation, not only the first one.
export function validate(scenario: Scenario, ds: Dataset = DEFAULT_DATASET): ValidationResult {
  const byId = measureIndex(ds);
  const errors: ValidationError[] = [];
  const decisions = scenario.decisions ?? [];
  const known = decisions.filter((d) => byId.has(d.measureId));

  if (decisions.length !== DECISIONS_COUNT) {
    errors.push({
      code: "COUNT",
      message: `Нужно ровно ${DECISIONS_COUNT} решений, сейчас ${decisions.length}`,
    });
  }

  const cost = known.reduce((sum, d) => sum + byId.get(d.measureId)!.cost, 0);
  if (cost > BUDGET) {
    errors.push({ code: "BUDGET", message: `Бюджет ${BUDGET} превышен: стоимость набора ${cost}` });
  }

  const seen = new Set<string>();
  for (const d of known) {
    if (seen.has(d.measureId)) {
      errors.push({ code: "DUPLICATE", message: `${d.measureId} выбрана больше одного раза` });
    }
    seen.add(d.measureId);
  }

  for (const d of known) {
    const m = byId.get(d.measureId)!;
    if (m.scope === "district" && !d.districtId) {
      errors.push({ code: "DISTRICT_REQUIRED", message: `${m.id} «${m.title}»: укажите район` });
    }
    if (m.scope === "city" && d.districtId) {
      errors.push({ code: "DISTRICT_FORBIDDEN", message: `${m.id} «${m.title}» действует на весь город, район не нужен` });
    }
  }

  const perDirection = new Map<Direction, number>();
  for (const id of seen) {
    const dir = byId.get(id)!.direction;
    perDirection.set(dir, (perDirection.get(dir) ?? 0) + 1);
  }
  for (const [dir, n] of perDirection) {
    if (n > DIRECTION_CAP) {
      errors.push({
        code: "DIRECTION_CAP",
        message: `Не более ${DIRECTION_CAP} мер из направления «${DIRECTION_LABELS[dir]}», выбрано ${n}`,
      });
    }
  }

  const districtOf = new Map(known.map((d) => [d.measureId, d.districtId]));
  for (const c of ds.conflicts) {
    const [a, b] = c.pair;
    if (!districtOf.has(a) || !districtOf.has(b)) continue;
    const sameDistrict = districtOf.get(a) === districtOf.get(b);
    if (!c.sameDistrictOnly || sameDistrict) {
      const where = c.sameDistrictOnly && districtOf.get(a) ? ` (${DISTRICT_LABELS[districtOf.get(a)!]})` : "";
      errors.push({ code: "CONFLICT", message: `${a} и ${b} несовместимы${where}: ${c.reason}` });
    }
  }

  return { ok: errors.length === 0, errors, cost, remaining: BUDGET - cost };
}
