import { describe, expect, it } from "vitest";
import sample from "../../../fixtures/sample-run.json";
import type { Run } from "@/lib/types";
import { DISTRICT_LABELS } from "@/lib/types";
import { mockShockFor } from "./shock";

const run = sample as Run;

describe("mockShockFor", () => {
  it("hits the weakest district on its lowest indicator, deterministically", () => {
    const shock = mockShockFor(run);
    expect(shock).toEqual(mockShockFor(run));
    expect(shock.districtId in DISTRICT_LABELS).toBe(true);
    expect(shock).toMatchObject({ districtId: "nura", indicator: "T2" });
    expect(shock.delta).toBeLessThan(0);
    expect(shock.title).not.toBe("");
  });
});
