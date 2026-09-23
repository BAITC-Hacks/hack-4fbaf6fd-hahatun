import { listRuns } from "@/lib/ui/run-source";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Leaderboard feed: run summaries (id, teamName, createdAt + score, outcome…), best Score first.
export async function GET() {
  return Response.json(await listRuns());
}
