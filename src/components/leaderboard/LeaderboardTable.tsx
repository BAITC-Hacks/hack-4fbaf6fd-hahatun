import Link from "next/link";
import type { RunSummary } from "@/lib/ui/run-source";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LeaderboardRow } from "./LeaderboardRow";

const COLUMNS: { label: string; align?: "right" }[] = [
  { label: "№" },
  { label: "Команда" },
  { label: "Score", align: "right" },
  { label: "К базе", align: "right" },
  { label: "Исход" },
  { label: "Перцентиль", align: "right" },
  { label: "Слабейший район" },
  { label: "Ревизия", align: "right" },
  { label: "Время", align: "right" },
];

export function LeaderboardTable({ runs }: { runs: RunSummary[] }) {
  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-8">
        <p className="text-muted-foreground">Пока никто не прошёл консилиум. Соберите набор в кабинете.</p>
        <Link href="/play" className={buttonVariants()}>
          В кабинет
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="font-mono text-[0.68rem] tracking-[0.12em] text-muted-foreground uppercase">
            {COLUMNS.map((c) => (
              <th
                key={c.label}
                scope="col"
                className={cn("px-4 py-3 font-normal", c.align === "right" ? "text-right" : "text-left")}
              >
                {c.label}
              </th>
            ))}
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">Действия</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run, i) => (
            <LeaderboardRow key={run.id} run={run} rank={i + 1} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
