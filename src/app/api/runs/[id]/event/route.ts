import { buildEvent } from "@/lib/engine/events";
import { loadRun } from "@/lib/store/runs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A14: deterministic unexpected city event for a finished run.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await loadRun(id);
  if (!run) return Response.json({ error: "run not found" }, { status: 404 });
  return Response.json(buildEvent(run));
}
