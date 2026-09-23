import type { Decision, Direction, DistrictId, Measure, MeasureId } from "@/lib/types";

export type MeasureLookup = Record<MeasureId, Measure>;

const DIRECTIONS: Direction[] = ["transport", "ecology", "social", "safety", "service"];
const MEASURE_ID = /^M(1[0-4]|[1-9])$/;
const DISTRICT_IDS: DistrictId[] = ["esil", "almaty", "saryarka", "baikonur", "nura"];

/** Adds the measure or removes it if already chosen. District is picked separately. */
export function toggleMeasure(decisions: Decision[], measureId: MeasureId): Decision[] {
  return decisions.some((d) => d.measureId === measureId)
    ? decisions.filter((d) => d.measureId !== measureId)
    : [...decisions, { measureId }];
}

export function setDistrict(decisions: Decision[], measureId: MeasureId, districtId: DistrictId): Decision[] {
  return decisions.map((d) => (d.measureId === measureId ? { ...d, districtId } : d));
}

export function totalCost(decisions: Decision[], measures: MeasureLookup): number {
  return decisions.reduce((sum, d) => sum + (measures[d.measureId]?.cost ?? 0), 0);
}

export function directionCounts(decisions: Decision[], measures: MeasureLookup): Record<Direction, number> {
  const counts = Object.fromEntries(DIRECTIONS.map((dir) => [dir, 0])) as Record<Direction, number>;
  for (const d of decisions) {
    const measure = measures[d.measureId];
    if (measure) counts[measure.direction] += 1;
  }
  return counts;
}

/** Compact URL form: "M7.nura,M8.nura,M12". */
export function encodeDecisions(decisions: Decision[]): string {
  return decisions.map((d) => (d.districtId ? `${d.measureId}.${d.districtId}` : d.measureId)).join(",");
}

/** Inverse of encodeDecisions; silently drops malformed parts. */
export function decodeDecisions(value: string | null | undefined): Decision[] {
  if (!value) return [];
  const out: Decision[] = [];
  for (const part of value.split(",")) {
    const [id, district] = part.trim().split(".");
    if (!MEASURE_ID.test(id)) continue;
    const districtId = DISTRICT_IDS.find((x) => x === district);
    out.push(districtId ? { measureId: id as MeasureId, districtId } : { measureId: id as MeasureId });
  }
  return out;
}
