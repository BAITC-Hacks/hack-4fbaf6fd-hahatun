import { listRuns } from "@/lib/store/runs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await listRuns());
}
