import { DISTRICTS, MEASURES, MEASURE_BY_ID } from "@/lib/data";
import { scoreOf } from "./engine";
import { validate } from "./validator";
import { DISTRICT_LABELS, type Decision, type Improvement, type OptimizerResult, type Scenario } from "@/lib/types";

const EPS = 1e-9;

// All single-decision replacements: any measure × (its districts, or nothing for city-scope measures).
function buildCandidates(): Decision[] {
  const list: Decision[] = [];
  for (const m of MEASURES) {
    if (m.scope === "city") {
      list.push({ measureId: m.id });
    } else {
      for (const d of DISTRICTS) list.push({ measureId: m.id, districtId: d.id });
    }
  }
  return list;
}

const CANDIDATES = buildCandidates();

function decisionKey(decisions: Decision[]): string {
  return decisions
    .map((d) => `${d.measureId}:${d.districtId ?? ""}`)
    .sort()
    .join("|");
}

// "M5 Сарыарка → M3 Линия ЛРТ / расширение, Нура" / "M12 → M14 ... (город)" / "M7 Есиль → M7 Нура".
function describeChange(before: Decision, after: Decision): string {
  const beforeLabel = `${before.measureId}${before.districtId ? ` ${DISTRICT_LABELS[before.districtId]}` : ""}`;
  let afterLabel: string;
  if (after.measureId === before.measureId) {
    afterLabel = `${after.measureId} ${DISTRICT_LABELS[after.districtId!]}`;
  } else {
    const m = MEASURE_BY_ID[after.measureId];
    afterLabel =
      m.scope === "district"
        ? `${m.id} ${m.title}, ${DISTRICT_LABELS[after.districtId!]}`
        : `${m.id} ${m.title} (город)`;
  }
  return `${beforeLabel} → ${afterLabel}`;
}

// A5-lite: single-swap neighbours only (no full enumeration).
export function optimize(scenario: Scenario): OptimizerResult {
  const decisions = scenario.decisions ?? [];
  const userScore = scoreOf(decisions);

  let bestScore = userScore;
  let bestDecisions = decisions;

  let validNeighbors = 0;
  let notBetterCount = 0; // valid neighbours with score <= userScore (within tolerance)

  const seen = new Set<string>();
  const improvementCandidates: { decisions: Decision[]; score: number; change: string }[] = [];

  for (let i = 0; i < decisions.length; i++) {
    for (const cand of CANDIDATES) {
      const next = decisions.map((d, j) => (j === i ? cand : d));
      const v = validate({ decisions: next });
      if (!v.ok) continue;

      const score = scoreOf(next);
      validNeighbors++;

      if (score > bestScore) {
        bestScore = score;
        bestDecisions = next;
      }

      if (score > userScore + EPS) {
        const key = decisionKey(next);
        if (!seen.has(key)) {
          seen.add(key);
          improvementCandidates.push({ decisions: next, score, change: describeChange(decisions[i], cand) });
        }
      } else {
        notBetterCount++;
      }
    }
  }

  improvementCandidates.sort((a, b) => b.score - a.score);
  const improvements: Improvement[] = improvementCandidates.slice(0, 3).map((c) => ({
    scenario: { decisions: c.decisions },
    score: c.score,
    delta: c.score - userScore,
    change: c.change,
  }));

  // Percentile among neighbours, counting the user's own set as one of them.
  const percentile = (notBetterCount + 1) / (validNeighbors + 1);

  return {
    bestScore,
    bestScenario: { decisions: bestDecisions },
    percentile,
    improvements,
  };
}
