import type { Fact } from "@/lib/types";

interface FactChipProps {
  id: string;
  facts: Fact[];
}

// Fact id as a mono chip; the engine fact text shows as a native tooltip.
export function FactChip({ id, facts }: FactChipProps) {
  const fact = facts.find((f) => f.id === id);
  return (
    <abbr
      title={fact ? `${id}: ${fact.text}` : `${id}: факт не найден`}
      className="inline-flex h-5 cursor-help items-center rounded-sm border border-border bg-muted/60 px-1.5 font-mono text-[0.7rem] text-foreground/80 tabular-nums no-underline"
    >
      {id}
    </abbr>
  );
}
