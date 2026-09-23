import { BUDGET, DECISIONS_COUNT, DIRECTION_CAP } from "@/lib/types";
import { formatScore } from "@/lib/ui/format";

interface BriefingSummaryProps {
  baseScore: number;
  nCrit: number; // critical indicator values before any decision
}

function Cell({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex flex-col gap-1 bg-card px-5 py-4">
      <p className="font-mono text-[0.68rem] tracking-[0.12em] text-muted-foreground uppercase">{label}</p>
      <p className="font-display text-3xl leading-none font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

export function BriefingSummary({ baseScore, nCrit }: BriefingSummaryProps) {
  return (
    <section
      aria-label="Исходные условия"
      className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3"
    >
      <Cell
        label="Базовый Score"
        value={formatScore(baseScore)}
        note={`без единого решения · критических значений: ${nCrit}, по −1 за каждое`}
      />
      <Cell label="Бюджет" value={String(BUDGET)} note="у.е. на всех, остаток не сгорает и не даёт бонуса" />
      <Cell
        label="Решений"
        value={String(DECISIONS_COUNT)}
        note={`ровно ${DECISIONS_COUNT}, не больше ${DIRECTION_CAP} на направление`}
      />
    </section>
  );
}
