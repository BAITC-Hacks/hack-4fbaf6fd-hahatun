import type { Resolution } from "@/lib/types";
import { Disclosure } from "@/components/result/Disclosure";
import { OUTCOME_LABELS, OUTCOME_TONE } from "@/lib/ui/labels";
import { cn } from "@/lib/utils";
import { VoiceButton } from "@/components/result/VoiceButton";

// The arbiter's decision in three lines; «Читать полностью» only lifts the clamp,
// the full text is already in the DOM, so screen readers get it without a click.
export function ResolutionBrief({ resolution, voiceRunId }: { resolution: Resolution; voiceRunId?: string }) {
  const { outcome, justification } = resolution;
  return (
    <div className="group/just flex flex-col gap-2">
      <h3 className="font-display text-base font-semibold">Резолюция</h3>
      <p>
        Постановляю: <span className={cn("font-semibold", OUTCOME_TONE[outcome].text)}>{OUTCOME_LABELS[outcome]}</span>.
      </p>
      <p className="line-clamp-3 max-w-[70ch] leading-relaxed group-has-[details[open]]/just:line-clamp-none">
        {justification}
      </p>
      {voiceRunId ? <VoiceButton runId={voiceRunId} /> : null}
      <Disclosure
        title={
          <>
            <span className="[details[open]>summary>&]:hidden">Читать полностью</span>
            <span className="hidden [details[open]>summary>&]:inline">Свернуть</span>
          </>
        }
      />
    </div>
  );
}
