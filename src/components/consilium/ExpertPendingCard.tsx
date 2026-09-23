import type { ExpertRole } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/ui/labels";

// Placeholder while an expert's opinion is still being generated.
export function ExpertPendingCard({ role }: { role: ExpertRole }) {
  return (
    <article
      aria-busy="true"
      className="flex min-h-40 animate-pulse flex-col gap-3 rounded-xl bg-card/60 p-4 ring-1 ring-foreground/10 motion-reduce:animate-none"
    >
      <p className="font-mono text-[0.7rem] tracking-[0.12em] text-muted-foreground uppercase">
        {ROLE_LABELS[role]}
      </p>
      <p className="text-sm text-muted-foreground">думает…</p>
      <div className="space-y-2">
        <div className="h-2 w-full rounded-full bg-muted" />
        <div className="h-2 w-4/5 rounded-full bg-muted" />
        <div className="h-2 w-3/5 rounded-full bg-muted" />
      </div>
    </article>
  );
}
