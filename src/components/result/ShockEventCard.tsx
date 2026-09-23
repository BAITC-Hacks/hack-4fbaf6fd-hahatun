import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import type { Run } from "@/lib/types";
import { DISTRICT_LABELS, INDICATOR_LABELS } from "@/lib/types";
import { buttonVariants } from "@/components/ui/button";
import { formatDelta } from "@/lib/ui/format";
import { encodeDecisions } from "@/lib/ui/scenario";
import { mockShockFor } from "@/lib/ui/shock";

// Sudden event after the verdict: what hit which district, and a way back to the cabinet with the same set.
export function ShockEventCard({ run }: { run: Run }) {
  // ponytail: mock until the backend sends the event in Run; then read it from run instead.
  const shock = mockShockFor(run);
  const href = `/play?s=${encodeDecisions(run.scenario.decisions)}`;
  return (
    <section
      aria-labelledby="shock-title"
      className="flex flex-col gap-4 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-5 md:flex-row md:items-end md:justify-between"
    >
      <div className="space-y-2">
        <h2 id="shock-title" className="flex items-center gap-2 font-display text-lg font-semibold text-balance">
          <TriangleAlert className="size-5 shrink-0 text-destructive" aria-hidden />
          Внезапное событие: {shock.title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {DISTRICT_LABELS[shock.districtId]} · <span className="font-mono">{shock.indicator}</span>{" "}
          {INDICATOR_LABELS[shock.indicator]} · штраф{" "}
          <span className="font-medium text-destructive tabular-nums">{formatDelta(shock.delta)}</span>
        </p>
        <p className="max-w-[65ch]">{shock.text}</p>
        <p className="text-xs text-muted-foreground">Пример события: данные от консилиума появятся позже</p>
      </div>
      <Link href={href} className={buttonVariants()}>
        Перераспределить бюджет
      </Link>
    </section>
  );
}
