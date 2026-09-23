import type { ExpertOpinion, ExpertRole, Fact } from "@/lib/types";
import { ExpertCard } from "./ExpertCard";
import { ExpertPendingCard } from "./ExpertPendingCard";

interface ExpertTableProps {
  opinions: ExpertOpinion[];
  facts: Fact[];
  pending?: ExpertRole[]; // roles still thinking while the run streams
}

const ROLE_ORDER: ExpertRole[] = ["transport", "ecology", "social", "safety", "service", "finance"];

export function ExpertTable({ opinions, facts, pending = [] }: ExpertTableProps) {
  const cards = ROLE_ORDER.map((role) => {
    const opinion = opinions.find((o) => o.role === role);
    if (opinion) return <ExpertCard key={role} opinion={opinion} facts={facts} />;
    if (pending.includes(role)) return <ExpertPendingCard key={role} role={role} />;
    return null;
  }).filter(Boolean);

  if (cards.length === 0) {
    return <p className="text-sm text-muted-foreground">Эксперты ещё не собрались.</p>;
  }
  return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{cards}</div>;
}
