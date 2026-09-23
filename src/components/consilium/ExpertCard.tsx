import type { ExpertOpinion, Fact } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/ui/labels";
import { cn } from "@/lib/utils";
import { ExpertDetails } from "./ExpertDetails";
import { FactChip } from "./FactChip";

interface ExpertCardProps {
  opinion: ExpertOpinion;
  facts: Fact[];
}

const STANCE = {
  support: { label: "поддерживает", className: "border-outcome-approve/40 bg-outcome-approve/5 text-outcome-approve" },
  concern: {
    label: "возражает",
    className: "border-outcome-conditions/40 bg-outcome-conditions/5 text-outcome-conditions",
  },
} as const;

export function ExpertCard({ opinion, facts }: ExpertCardProps) {
  const stance = STANCE[opinion.stance];
  return (
    <article className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[0.7rem] tracking-[0.12em] text-muted-foreground uppercase">
            {ROLE_LABELS[opinion.role]}
          </p>
          <p className="mt-0.5 font-medium">{opinion.name}</p>
        </div>
        <span className={cn("rounded-full border px-2 py-0.5 text-xs font-medium", stance.className)}>
          {stance.label}
        </span>
      </header>
      <p className="text-sm leading-relaxed">{opinion.summary}</p>
      <ExpertDetails opinion={opinion} />
      {opinion.factRefs.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-1">
          {opinion.factRefs.map((id) => (
            <FactChip key={id} id={id} facts={facts} />
          ))}
        </div>
      )}
    </article>
  );
}
