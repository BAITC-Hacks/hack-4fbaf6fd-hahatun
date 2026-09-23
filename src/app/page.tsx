import { BriefingSummary } from "@/components/briefing/BriefingSummary";
import { DistrictGrid } from "@/components/briefing/DistrictGrid";
import { TeamForm } from "@/components/briefing/TeamForm";
import { DistrictHeatMap } from "@/components/map/DistrictHeatMap";
import { PageHeader } from "@/components/shell/PageHeader";
import { DISTRICTS } from "@/lib/data";
import { calculate } from "@/lib/engine";
import type { DistrictId } from "@/lib/types";

export default function BriefingPage() {
  // Empty scenario = the city as is: base Score and district D straight from the engine.
  const base = calculate({ decisions: [] });
  const scores = Object.fromEntries(base.districts.map((d) => [d.id, d.dBefore])) as Record<DistrictId, number>;

  return (
    <>
      <PageHeader
        eyebrow="Шаг 1 из 3"
        title="Брифинг"
        lead="Пять районов Астаны, бюджет 100 у.е. и ровно пять решений. Сначала посмотрите, где городу хуже всего."
      />
      <div className="flex flex-col gap-8">
        <BriefingSummary baseScore={base.baseScore} nCrit={base.nCrit} />
        <section aria-label="Схема районов" className="rounded-lg border border-border bg-card p-5">
          <DistrictHeatMap values={scores} caption="Качество жизни по районам до решений" />
        </section>
        <DistrictGrid districts={DISTRICTS} scores={scores} />
        <TeamForm />
      </div>
    </>
  );
}
