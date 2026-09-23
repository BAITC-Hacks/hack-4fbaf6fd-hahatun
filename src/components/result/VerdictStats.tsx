import { ShieldCheck } from "lucide-react";
import type { Run } from "@/lib/types";
import { DISTRICT_LABELS } from "@/lib/types";
import { formatPercent, formatScore } from "@/lib/ui/format";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { VerdictStat } from "@/components/result/VerdictStat";

const DATE_FORMAT = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Asia/Almaty",
});

// Secondary verdict numbers: percentile, weakest district, criticals, review badge, run meta.
export function VerdictStats({ run }: { run: Run }) {
  const { engine, optimizer } = run;
  const review = run.reviews.at(-1);
  return (
    <dl className="grid flex-1 grid-cols-2 gap-x-8 gap-y-4 border-l border-border pl-8 lg:grid-cols-3">
      <VerdictStat label="Перцентиль">
        лучше, чем <span className="tabular-nums">{formatPercent(optimizer.percentile)}</span> допустимых наборов
      </VerdictStat>
      <VerdictStat label="Слабейший район">
        {DISTRICT_LABELS[engine.minDistrict.id]} · D{" "}
        <span className="tabular-nums">{formatScore(engine.minDistrict.value)}</span>
      </VerdictStat>
      <VerdictStat label="Штраф N_crit">
        <span className={cn(engine.nCrit > 0 && "text-destructive")}>
          критических значений: <span className="tabular-nums">{engine.nCrit}</span>
        </span>
      </VerdictStat>
      {review && (
        <VerdictStat label="Ревизия заключения">
          <Badge variant="outline" className={review.ok ? "text-outcome-approve" : "text-destructive"}>
            <ShieldCheck aria-hidden />
            проверено {review.passed} из {review.total}
          </Badge>
        </VerdictStat>
      )}
      <VerdictStat label="Команда">{run.teamName}</VerdictStat>
      <VerdictStat label="Дата прогона">{DATE_FORMAT.format(new Date(run.createdAt))}</VerdictStat>
    </dl>
  );
}
