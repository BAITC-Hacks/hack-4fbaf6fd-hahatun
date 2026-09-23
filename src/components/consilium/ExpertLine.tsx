import type { ExpertOpinion } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/ui/labels";
import { firstSentence } from "@/lib/ui/verdict";
import { cn } from "@/lib/utils";

const STANCE = {
  support: { label: "поддерживает", className: "text-outcome-approve" },
  concern: { label: "возражает", className: "text-outcome-conditions" },
} as const;

// One expert in one line: name, role, stance, the first sentence of the opinion.
export function ExpertLine({ opinion }: { opinion: ExpertOpinion }) {
  const stance = STANCE[opinion.stance];
  const sentence = firstSentence(opinion.summary);
  return (
    <li className="grid gap-x-4 gap-y-0.5 py-2.5 text-sm sm:grid-cols-[11rem_7rem_minmax(0,1fr)]">
      <span>
        <span className="font-medium">{opinion.name}</span>
        <span className="text-muted-foreground"> · {ROLE_LABELS[opinion.role]}</span>
      </span>
      <span className={cn("font-medium", stance.className)}>{stance.label}</span>
      <span title={sentence} className="line-clamp-2 text-muted-foreground sm:line-clamp-1">
        {sentence}
      </span>
    </li>
  );
}
