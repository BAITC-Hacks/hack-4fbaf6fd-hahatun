import type { Outcome } from "@/lib/types";
import { OUTCOME_LABELS, OUTCOME_TONE } from "@/lib/ui/labels";
import { cn } from "@/lib/utils";

interface OutcomeStampProps {
  outcome: Outcome;
  size?: "sm" | "lg";
  className?: string;
}

// Round ink stamp, slightly rotated like a real seal on a resolution.
export function OutcomeStamp({ outcome, size = "lg", className }: OutcomeStampProps) {
  const tone = OUTCOME_TONE[outcome];
  return (
    <div
      role="img"
      aria-label={`Исход: ${OUTCOME_LABELS[outcome]}`}
      className={cn(
        "grid shrink-0 -rotate-6 place-items-center rounded-full border-[3px] border-double text-center font-display leading-tight font-semibold uppercase",
        tone.border,
        tone.text,
        size === "lg" ? "size-32 p-3 text-[0.72rem] tracking-[0.08em]" : "size-20 p-2 text-[0.55rem] tracking-[0.06em]",
        className,
      )}
    >
      <span className="flex flex-col items-center gap-1">
        <span className="font-mono text-[0.6em] tracking-[0.2em] opacity-80">Акимат · Астана</span>
        <span>{OUTCOME_LABELS[outcome]}</span>
      </span>
    </div>
  );
}
