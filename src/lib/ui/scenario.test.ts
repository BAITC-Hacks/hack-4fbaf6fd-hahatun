import { describe, expect, it } from "vitest";
import type { Measure, MeasureId } from "@/lib/types";
import {
  decodeDecisions,
  directionCounts,
  encodeDecisions,
  setDistrict,
  toggleMeasure,
  totalCost,
  type MeasureLookup,
} from "./scenario";

const m = (id: MeasureId, direction: Measure["direction"], cost: number): Measure => ({
  id, direction, cost, title: id, scope: "district", lag: 1, effects: {},
});
const MEASURES = { M7: m("M7", "social", 24), M8: m("M8", "social", 20), M12: m("M12", "service", 14) } as MeasureLookup;

describe("scenario helpers", () => {
  it("toggles measures and keeps districts", () => {
    let d = toggleMeasure([], "M7");
    d = setDistrict(d, "M7", "nura");
    d = toggleMeasure(d, "M12");
    expect(d).toEqual([{ measureId: "M7", districtId: "nura" }, { measureId: "M12" }]);
    expect(toggleMeasure(d, "M7")).toEqual([{ measureId: "M12" }]);
  });
  it("counts cost and directions", () => {
    const d = [{ measureId: "M7" as const }, { measureId: "M8" as const }, { measureId: "M12" as const }];
    expect(totalCost(d, MEASURES)).toBe(58);
    expect(directionCounts(d, MEASURES)).toMatchObject({ social: 2, service: 1, transport: 0 });
  });
  it("round-trips the URL form and drops junk", () => {
    const d = [{ measureId: "M7" as const, districtId: "nura" as const }, { measureId: "M12" as const }];
    expect(encodeDecisions(d)).toBe("M7.nura,M12");
    expect(decodeDecisions("M7.nura,M12")).toEqual(d);
    expect(decodeDecisions("M99,x,M3.mars")).toEqual([{ measureId: "M3" }]);
  });
});
