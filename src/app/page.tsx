import { DistrictGrid } from "@/components/briefing/DistrictGrid";
import { TeamForm } from "@/components/briefing/TeamForm";
import { BaiterekCanvas } from "@/components/landing/BaiterekCanvas";
import { DistrictHeatMap } from "@/components/map/DistrictHeatMap";
import { DISTRICTS, SCORE_WEIGHTS } from "@/lib/data";
import { calculate } from "@/lib/engine";
import { BUDGET, CRITICAL_THRESHOLD, DECISIONS_COUNT, DIRECTION_CAP, type DistrictId } from "@/lib/types";
import { formatDelta, formatScore } from "@/lib/ui/format";

export default function BriefingPage() {
  // Empty scenario = the city as is: base Score and district D straight from the engine.
  const base = calculate({ decisions: [] });
  const scores = Object.fromEntries(base.districts.map((d) => [d.id, d.dBefore])) as Record<DistrictId, number>;
  const rules = [
    `${BUDGET} у.е. на всех`,
    `ровно ${DECISIONS_COUNT} решений`,
    `не больше ${DIRECTION_CAP} на направление`,
    `базовый Score ${formatScore(base.baseScore)}`,
  ];

  return (
    <div className="flex flex-col gap-20">
      <section aria-labelledby="hero-title" className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
        <div className="flex max-w-xl flex-col gap-7">
          <h1
            id="hero-title"
            className="font-display text-[2.1rem] leading-[1.12] font-semibold tracking-[-0.02em] text-balance lg:text-[2.6rem]"
          >
            Станьте акимом Астаны на&nbsp;пять часов
          </h1>
          <p className="text-lg leading-relaxed text-pretty text-muted-foreground">
            Пять районов, бюджет {BUDGET} у.е. и ровно {DECISIONS_COUNT} решений. Код считает Astana Quality of Life
            Score, консилиум из шести AI-экспертов спорит о вашем наборе, ревизоры сверяют каждое число, а арбитр
            выносит резолюцию.
          </p>
          <TeamForm />
          <p className="flex flex-wrap gap-x-2 border-t border-border pt-4 text-sm text-muted-foreground tabular-nums">
            {rules.map((rule, i) => (
              <span key={rule} className="whitespace-nowrap">
                {rule}
                {i < rules.length - 1 && " ·"}
              </span>
            ))}
          </p>
        </div>
        <BaiterekCanvas />
      </section>

      <section aria-labelledby="districts-title" className="flex flex-col gap-6">
        <div className="flex max-w-3xl flex-col gap-2">
          <h2 id="districts-title" className="font-display text-2xl font-semibold tracking-[-0.02em]">
            Где городу хуже всего
          </h2>
          <p className="text-muted-foreground text-pretty">
            D района от 0 до 100, слабейший район первым. Показатели ниже {CRITICAL_THRESHOLD} критические: сейчас их{" "}
            {base.nCrit}, каждое даёт {formatDelta(-SCORE_WEIGHTS.criticalPenalty)} к Score.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <DistrictHeatMap values={scores} caption="Качество жизни по районам до решений" />
        </div>
        <DistrictGrid districts={DISTRICTS} scores={scores} />
      </section>
    </div>
  );
}
