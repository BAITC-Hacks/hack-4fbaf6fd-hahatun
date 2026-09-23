import type { Metadata } from "next";
import { connection } from "next/server";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { PageHeader } from "@/components/shell/PageHeader";
import { listRuns } from "@/lib/ui/run-source";

export const metadata: Metadata = { title: "Лидерборд" };

export default async function LeaderboardPage() {
  await connection(); // runs are files written at request time, never prerender
  const runs = await listRuns();

  return (
    <>
      <PageHeader
        title="Лидерборд"
        lead="Все прогоны на одних исходных данных и одном бюджете. Выше — тот, чей набор дал больший Score."
      />
      <LeaderboardTable runs={runs} />
    </>
  );
}
