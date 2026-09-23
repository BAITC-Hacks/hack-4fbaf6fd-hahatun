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

const SANDBOX_NOTE = <p className="mt-3 text-xs text-muted-foreground">Прогоны в песочнице в рейтинг не входят.</p>;

export function LeaderboardTable({ runs: all }: { runs: RunSummary[] }) {
  const runs = all.filter((r) => !r.sandbox); // imported datasets are not comparable with the case
  if (runs.length === 0) {
    return (
      <>
        <div className="flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-8">
          <p className="text-muted-foreground">Пока никто не прошёл консилиум. Соберите набор в кабинете.</p>
          <Link href="/play" className={buttonVariants()}>
            В кабинет
          </Link>
        </div>
        {SANDBOX_NOTE}
      </>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              {COLUMNS.map((c) => (
                <th
                  key={c.label}
                  scope="col"
                  className={cn("px-3 py-3 font-normal", c.align === "right" ? "text-right" : "text-left")}
                >
                  {c.label}
                </th>
              ))}
              <th scope="col" className="px-3 py-3">
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
      {SANDBOX_NOTE}
    </>
  );
}
