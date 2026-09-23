import type { Run } from "@/lib/types";
import { ArbiterResolution } from "./ArbiterResolution";
import { DraftHistory } from "./DraftHistory";
import { ExpertTable } from "./ExpertTable";
import { HallSection } from "./HallSection";
import { ReviewerBoard } from "./ReviewerBoard";

export function ConsiliumHall({ run }: { run: Run }) {
  return (
    <section aria-labelledby="consilium-hall" className="space-y-12">
      <header className="max-w-3xl">
        <p className="font-mono text-xs tracking-[0.12em] text-muted-foreground uppercase">Консилиум</p>
        <h2 id="consilium-hall" className="mt-2 font-display text-2xl font-semibold tracking-tight">
          Зал заседаний
        </h2>
        <p className="mt-2 text-muted-foreground">
          Эксперты высказываются, синтезатор пишет заключение, ревизоры проверяют его по шести условиям,
          арбитр выносит резолюцию. Все числа — из фактов движка.
        </p>
        {!run.llmEnabled && (
          <p className="mt-3 border-l-2 border-gold pl-3 text-sm text-muted-foreground">
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
      </HallSection>
    </section>
  );
}
