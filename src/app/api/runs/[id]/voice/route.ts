import { loadRun } from "@/lib/store/runs";
import { isLlmEnabled } from "@/lib/consilium/llm";
import { voiceMp3 } from "@/lib/voice/voice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/runs/:id/voice — the resolution read aloud (mp3), cached per run.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await loadRun(id);
  if (!run) return Response.json({ error: "run not found" }, { status: 404 });
  if (!isLlmEnabled()) return Response.json({ error: "Озвучка недоступна без ключа OpenAI" }, { status: 503 });
  try {
    const bytes = await voiceMp3(run);
    return new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=3600", "Content-Length": String(bytes.byteLength) },
    });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Озвучка не удалась" }, { status: 502 });
  }
}
