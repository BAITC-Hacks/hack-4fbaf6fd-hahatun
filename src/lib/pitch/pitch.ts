import { MEASURE_BY_ID } from "@/lib/data/measures";
import { BUDGET, CRITICAL_THRESHOLD, DISTRICT_LABELS, type Run } from "@/lib/types";
import { OUTCOME_LABELS, ROLE_LABELS } from "@/lib/ui/labels";

// A15: short markdown pitch of a saved run, for the jury / a slide. Only numbers already
// present on the Run are used — nothing here is invented or recomputed beyond arithmetic
// on those numbers (sums, deltas, percentages).

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function fmt(n: number): string {
  const r = round2(n);
  return Object.is(r, -0) ? "0.00" : r.toFixed(2);
}

function fmtSigned(n: number): string {
  const r = round2(n);
  if (Object.is(r, -0) || r === 0) return "+0.00";
  return r > 0 ? `+${r.toFixed(2)}` : r.toFixed(2);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day}.${month}.${year} ${hours}:${minutes} UTC`;
}

function countCriticalsBefore(run: Run): number {
  let n = 0;
  for (const d of run.engine.districts) {
    for (const value of Object.values(d.before)) {
      if (value < CRITICAL_THRESHOLD) n++;
    }
  }
  return n;
}

function stanceLabel(stance: "support" | "concern"): string {
  return stance === "support" ? "за" : "против";
}

function buildDecisionsSection(run: Run): string {
  const rows = run.scenario.decisions.map((decision) => {
    const measure = MEASURE_BY_ID[decision.measureId];
    const district = decision.districtId ? DISTRICT_LABELS[decision.districtId] : "весь город";
    return `| ${measure.id} | ${measure.title} | ${district} | ${measure.cost} |`;
  });
  const totalCost = run.scenario.decisions.reduce((sum, d) => sum + MEASURE_BY_ID[d.measureId].cost, 0);
  const remaining = BUDGET - totalCost;
  return [
    "## Решения",
    "",
    "| ID | Мера | Район | Стоимость |",
    "|---|---|---|---|",
    ...rows,
    "",
    `**Итого:** стоимость набора ${totalCost}, остаток бюджета ${remaining} из ${BUDGET}.`,
  ].join("\n");
}

function buildResultSection(run: Run): string {
  const { engine, optimizer } = run;
  const weakest = engine.districts.find((d) => d.id === engine.minDistrict.id);
  const weakestBefore = weakest ? fmt(weakest.dBefore) : fmt(engine.minDistrict.value);
  const weakestAfter = weakest ? fmt(weakest.dAfter) : fmt(engine.minDistrict.value);
  const criticalsBefore = countCriticalsBefore(run);
  const synergiesLine = engine.synergies.length > 0 ? engine.synergies.join("; ") : "нет";
  return [
    "## Результат",
    "",
    `- **Score:** ${fmt(engine.score)} (база ${fmt(engine.baseScore)}, дельта ${fmtSigned(engine.delta)})`,
    `- **Перцентиль:** ${fmt(optimizer.percentile * 100)}%`,
    `- **Слабейший район:** ${DISTRICT_LABELS[engine.minDistrict.id]} — D ${weakestBefore} → ${weakestAfter}`,
    `- **Критические значения (< ${CRITICAL_THRESHOLD}):** было ${criticalsBefore}, стало ${engine.nCrit}`,
    `- **Синергии:** ${synergiesLine}`,
  ].join("\n");
}

function buildDistrictsSection(run: Run): string {
  const rows = run.engine.districts.map((d) => {
    const delta = d.dAfter - d.dBefore;
    return `| ${DISTRICT_LABELS[d.id]} | ${fmt(d.dBefore)} | ${fmt(d.dAfter)} | ${fmtSigned(delta)} |`;
  });
  return [
    "## Районы",
    "",
    "| Район | D до | D после | Дельта |",
    "|---|---|---|---|",
    ...rows,
  ].join("\n");
}

function buildConsiliumSection(run: Run): string {
  const rows = run.opinions.map((o) => {
    const summary = o.summary.replace(/\|/g, "/").replace(/\n/g, " ");
    return `| ${o.name} | ${ROLE_LABELS[o.role]} | ${stanceLabel(o.stance)} | ${summary} |`;
  });
  return [
    "## Что говорит консилиум",
    "",
    "| Эксперт | Роль | Позиция | Мнение |",
    "|---|---|---|---|",
    ...rows,
  ].join("\n");
}

function buildReviewSection(run: Run): string {
  const review = run.reviews[run.reviews.length - 1];
  const lines = ["## Ревизия", ""];
  if (!review) {
    lines.push("Ревизий не было.");
    return lines.join("\n");
  }
  lines.push(`Пройдено ${review.passed} из ${review.total}. Кругов: ${run.reviews.length}.`);
  const failed = review.conditions.filter((c) => !c.passed);
  if (failed.length === 0) {
    lines.push("");
    lines.push("Проваленных условий нет.");
  } else {
    lines.push("");
    lines.push("Проваленные условия:");
    for (const c of failed) {
      const reason = c.reason ? oneLine(c.reason) : "причина не указана";
      lines.push(`- ${c.id}: ${reason}`);
    }
  }
  return lines.join("\n");
}

function buildResolutionSection(run: Run): string {
  const { resolution } = run;
  const lines = ["## Резолюция", "", `**${OUTCOME_LABELS[resolution.outcome]}**`, "", resolution.justification];
  if (resolution.disputes.length > 0) {
    lines.push("", "**Споры:**");
    for (const dispute of resolution.disputes) {
      lines.push(`- ${oneLine(dispute.topic)} — на стороне «${ROLE_LABELS[dispute.sideTaken]}»: ${oneLine(dispute.reason)}`);
    }
  }
  if (resolution.mandates.length > 0) {
    lines.push("", "**Поручения:**");
    for (const mandate of resolution.mandates) {
      lines.push(`- ${oneLine(mandate.text)} (расчётный Score ${fmt(mandate.improvement.score)})`);
    }
  }
  return lines.join("\n");
}

function buildMethodologySection(run: Run): string {
  const { usage } = run;
  const durationSec = fmt(usage.durationMs / 1000);
  const fallback = run.llmEnabled ? "" : " Без LLM (фолбэк).";
  return [
    "## Как это посчитано",
    "",
    "- Формула: Score = 0.7 × D_avg + 0.3 × min(D_district) − N_crit (критические — значения строго ниже 40).",
    "- Числа считает движок, LLM только объясняет, каждое число проверено против фактов.",
    `- Расход: ${usage.calls} вызовов, ${usage.tokens} токенов, $${fmt(usage.costUsd)}, ${durationSec} с.${fallback}`,
  ].join("\n");
}

// Markdown structure must survive LLM/user text: collapse line breaks inside list items and headings.
const oneLine = (text: string) => text.replace(/\s*\n+\s*/g, " ").trim();

export function buildPitch(run: Run): string {
  const sections = [
    `# Аким на 5 часов — сценарий команды «${oneLine(run.teamName)}»`,
    "",
    `${formatDate(run.createdAt)} · runId: \`${run.id}\``,
    "",
    buildDecisionsSection(run),
    "",
    buildResultSection(run),
    "",
    buildDistrictsSection(run),
    "",
    buildConsiliumSection(run),
    "",
    buildReviewSection(run),
    "",
    buildResolutionSection(run),
    "",
    buildMethodologySection(run),
    "",
  ];
  return sections.join("\n");
}
