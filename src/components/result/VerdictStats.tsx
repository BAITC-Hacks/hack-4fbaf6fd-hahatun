import { ShieldCheck } from "lucide-react";
import type { Run } from "@/lib/types";
import { DISTRICT_LABELS } from "@/lib/types";
import { formatPercent, formatScore } from "@/lib/ui/format";
import { cn } from "@/lib/utils";
import { VerdictStat } from "@/components/result/VerdictStat";

const DATE_FORMAT = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Asia/Almaty",
});

// Secondary verdict facts as a tidy definition list: percentile, weakest district, criticals, review, run meta.
export function VerdictStats({ run }: { run: Run }) {
  const { engine, optimizer } = run;
  const review = run.reviews.at(-1);
  return (
    <dl className="grid min-w-72 flex-1 grid-cols-[auto_minmax(0,1fr)] text-sm">
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
          <span
            className={cn("inline-flex items-center gap-1.5", review.ok ? "text-outcome-approve" : "text-destructive")}
          >
            <ShieldCheck aria-hidden className="size-4" />
            проверено <span className="tabular-nums">{review.passed} из {review.total}</span>
          </span>
        </VerdictStat>
      )}
      <VerdictStat label="Команда">{run.teamName}</VerdictStat>
      <VerdictStat label="Дата прогона">
        <span className="tabular-nums">{DATE_FORMAT.format(new Date(run.createdAt))}</span>
      </VerdictStat>
    </dl>
  );
}
