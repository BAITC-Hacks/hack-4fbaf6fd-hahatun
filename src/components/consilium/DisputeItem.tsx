import type { Fact, Resolution } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/ui/labels";
import { FactChip } from "./FactChip";

interface DisputeItemProps {
  dispute: Resolution["disputes"][number];
  facts: Fact[];
}

export function DisputeItem({ dispute, facts }: DisputeItemProps) {
  return (
    <li className="space-y-1.5 border-l-2 border-gold/60 pl-4">
      <p className="font-medium">{dispute.topic}</p>
      <p className="text-sm">
        Арбитр принял сторону: <span className="font-medium">{ROLE_LABELS[dispute.sideTaken]}</span>
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground">{dispute.reason}</p>
      {dispute.factRefs.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {dispute.factRefs.map((id) => (
            <FactChip key={id} id={id} facts={facts} />
          ))}
        </div>
      )}
    </li>
  );
}
