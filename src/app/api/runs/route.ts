import { connection } from "next/server";
import { listRuns } from "@/lib/ui/run-source";

// Leaderboard feed: run summaries, best Score first. Read from disk on every request.
export async function GET() {
  await connection();
  return Response.json(await listRuns());
}
