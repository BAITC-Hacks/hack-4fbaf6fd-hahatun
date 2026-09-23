import type { Run } from "@/lib/types";
import { CRITICAL_THRESHOLD, HORIZON_QUARTERS } from "@/lib/types";
import { formatScore } from "@/lib/ui/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MeasureContributions } from "@/components/result/MeasureContributions";

const STEPS = [
  `Эффект меры умножается на (${HORIZON_QUARTERS} − лаг)/${HORIZON_QUARTERS}: за горизонт в ${HORIZON_QUARTERS} кварталов успевает сработать только эта доля.`,
  "Синергия пары мер даёт фиксированный бонус в районе первой меры, без поправки на лаг.",
  "Каждый показатель после мер ограничивается диапазоном 0–100.",
  "D района — взвешенная сумма 10 показателей: у каждого показателя свой вес, сумма весов равна 1.",
  "D_avg — среднее D по районам с весом по доле населения.",
  `N_crit — штраф 1 балл за каждое значение показателя ниже ${CRITICAL_THRESHOLD} после мер.`,
  "70% веса — город в целом, 30% — самый слабый район, чтобы нельзя было подтянуть один район и забыть про остальные.",
];

// Plain-language explanation of the Score formula with this run's numbers and per-measure contributions.
export function HowCalculated({ run }: { run: Run }) {
  const { engine } = run;
  return (
    <Card className="gap-6 px-6 py-6">
      <CardHeader className="px-0">
        <CardTitle className="font-display text-lg font-semibold">Как считалось</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-8 px-0">
        <section className="flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-background px-4 py-3 font-mono text-sm">
            <p>Score = 0.7 × D_avg + 0.3 × min(D_d) − N_crit</p>
            <p className="mt-1 text-muted-foreground tabular-nums">
              = 0.7 × {formatScore(engine.dAvg)} + 0.3 × {formatScore(engine.minDistrict.value)} − {engine.nCrit}{" "}
              = <span className="font-semibold text-foreground">{formatScore(engine.score)}</span>
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Числа округлены для показа, движок считает без округления.
          </p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
            {STEPS.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </section>
        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-medium">Вклад мер</h3>
          <p className="text-xs text-muted-foreground">Насколько упадёт Score, если убрать меру из набора.</p>
          <MeasureContributions contributions={engine.contributions} decisions={run.scenario.decisions} />
          {engine.synergies.length > 0 && (
            <>
              <Separator />
              <h3 className="text-sm font-medium">Сработавшие синергии</h3>
              <ul className="flex flex-col gap-1 text-sm">
                {engine.synergies.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
