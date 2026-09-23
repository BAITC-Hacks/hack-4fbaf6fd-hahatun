import type { Fact, Resolution } from "@/lib/types";
import { DisputeItem } from "./DisputeItem";

const HEADING = "mb-3 text-sm font-medium";

// Disputes, mandate wording and the caveat: the rest of the resolution, shown on demand.
export function ResolutionDetails({ resolution, facts }: { resolution: Resolution; facts: Fact[] }) {
  const { disputes, mandates, caveat } = resolution;
  return (
    <div className="flex flex-col gap-6">
      {disputes.length > 0 && (
        <section>
          <h4 className={HEADING}>Споры</h4>
          <ul className="space-y-5">
            {disputes.map((d, i) => (
              <DisputeItem key={i} dispute={d} facts={facts} />
            ))}
          </ul>
        </section>
      )}
      {mandates.length > 0 && (
        <section>
          <h4 className={HEADING}>Поручения</h4>
          <ol className="max-w-[70ch] list-decimal space-y-2 pl-5 text-sm marker:text-muted-foreground">
            {mandates.map((m, i) => (
              <li key={i}>{m.text}</li>
            ))}
          </ol>
        </section>
      )}
      {caveat && (
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Оговорка.</span> {caveat}
        </p>
      )}
    </div>
  );
}
