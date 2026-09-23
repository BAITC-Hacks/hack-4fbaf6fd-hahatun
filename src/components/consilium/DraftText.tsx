import type { ReviewCondition } from "@/lib/types";
import { cn } from "@/lib/utils";
import { annotateDraft } from "./highlight";

interface DraftTextProps {
  text: string;
  failed: ReviewCondition[]; // failed conditions of this draft's review round
}

// Draft body with paragraphs quoted by failed conditions marked red, reason in the margin.
export function DraftText({ text, failed }: DraftTextProps) {
  const { segments, unmatched } = annotateDraft(text, failed);
  return (
    <div className="space-y-2">
      {segments.map((seg, i) => (
        <div key={i} className="grid gap-x-4 gap-y-1 md:grid-cols-[minmax(0,1fr)_14rem]">
          <p
            className={cn(
              "leading-relaxed",
              seg.failures.length > 0 && "rounded-r-sm border-l-2 border-destructive bg-destructive/10 py-1 pr-2 pl-3",
            )}
          >
            {seg.text}
          </p>
          {seg.failures.length > 0 && (
            <ul className="space-y-1 pt-1 text-xs text-destructive">
              {seg.failures.map((f) => (
                <li key={f.id}>
                  <span className="font-mono font-semibold">{f.id}</span>: {f.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      {unmatched.length > 0 && (
        <ul className="space-y-1 border-t border-border pt-2 text-xs text-destructive">
          {unmatched.map((f) => (
            <li key={f.id}>
              <span className="font-mono font-semibold">{f.id}</span>: {f.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
