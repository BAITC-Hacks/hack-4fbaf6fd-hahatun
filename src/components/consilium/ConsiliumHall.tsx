import type { Run } from "@/lib/types";
import { Disclosure } from "@/components/result/Disclosure";
import { DraftHistory } from "./DraftHistory";
import { ExpertLine } from "./ExpertLine";
import { ExpertTable } from "./ExpertTable";
import { ResolutionBrief } from "./ResolutionBrief";
import { ResolutionDetails } from "./ResolutionDetails";
import { ReviewerBoard } from "./ReviewerBoard";

// Short by default: decision, one line per expert, everything else behind disclosures.
// Expert lines come before any closed disclosure in the DOM, so each name's first match is visible.
export function ConsiliumHall({ run }: { run: Run }) {
  const { resolution } = run;
  const review = run.reviews.at(-1);
  const hasDetails = resolution.disputes.length > 0 || resolution.mandates.length > 0 || Boolean(resolution.caveat);
  return (
    <section aria-labelledby="consilium" className="flex flex-col gap-8">
      <h2 id="consilium" className="border-b border-border pb-2 font-display text-lg font-semibold">
        Консилиум
      </h2>
      <ResolutionBrief resolution={resolution} voiceRunId={run.llmEnabled && run.id !== "sample-run-001" ? run.id : undefined} />
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-base font-semibold">Эксперты</h3>
        <ul className="divide-y divide-border">
          {run.opinions.map((o) => (
            <ExpertLine key={o.role} opinion={o} />
          ))}
        </ul>
      </div>
      <div className="divide-y divide-border border-y border-border">
        {hasDetails && (
          <Disclosure title="Споры и поручения арбитра">
            <ResolutionDetails resolution={resolution} facts={run.facts} />
          </Disclosure>
        )}
        <Disclosure title="Мнения экспертов подробно">
          <ExpertTable opinions={run.opinions} facts={run.facts} />
        </Disclosure>
        <Disclosure title={review ? `Ревизия: ${review.passed} из ${review.total} условий` : "Ревизия"}>
          <ReviewerBoard reviews={run.reviews} />
        </Disclosure>
        <Disclosure title="Черновики заключения">
          <DraftHistory drafts={run.drafts} reviews={run.reviews} />
        </Disclosure>
      </div>
    </section>
  );
}
