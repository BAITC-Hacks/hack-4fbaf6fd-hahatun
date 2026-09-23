import type { Run } from "@/lib/types";
import { UsagePanel } from "@/components/result/UsagePanel";
import { ArbiterResolution } from "./ArbiterResolution";
import { DraftHistory } from "./DraftHistory";
import { ExpertTable } from "./ExpertTable";
import { HallSection } from "./HallSection";
import { ReviewerBoard } from "./ReviewerBoard";

export function ConsiliumHall({ run }: { run: Run }) {
  return (
    <section aria-labelledby="consilium-hall" className="space-y-12 pt-6">
      <header className="max-w-3xl">
        <h2 id="consilium-hall" className="font-display text-2xl font-semibold tracking-tight">
          Зал заседаний консилиума
        </h2>
        <p className="mt-2 max-w-[65ch] text-muted-foreground">
          Эксперты высказываются, синтезатор пишет заключение, ревизоры проверяют его по шести условиям,
          арбитр выносит резолюцию. Все числа — из фактов движка.
        </p>
        {!run.llmEnabled && (
          <p className="mt-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 text-sm">
            Демо-режим: ключ OpenAI не задан, тексты консилиума взяты из фикстуры. Расчёты движка живые.
          </p>
        )}
      </header>
      <HallSection title="Стол экспертов" hint="Шесть экспертов оценивают набор по своим направлениям.">
        <ExpertTable opinions={run.opinions} facts={run.facts} />
      </HallSection>
      <HallSection title="Табло ревизоров" hint="Каждый черновик проверяется по шести условиям.">
        <ReviewerBoard reviews={run.reviews} />
      </HallSection>
      <HallSection title="История черновиков" hint="Абзацы, отклонённые ревизорами, отмечены красным.">
        <DraftHistory drafts={run.drafts} reviews={run.reviews} />
      </HallSection>
      <HallSection title="Резолюция арбитра">
        <ArbiterResolution resolution={run.resolution} runId={run.id} facts={run.facts} />
        <UsagePanel run={run} />
      </HallSection>
    </section>
  );
}
