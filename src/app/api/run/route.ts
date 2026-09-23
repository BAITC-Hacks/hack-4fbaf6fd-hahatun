import { z } from "zod";
import { runConsilium } from "@/lib/consilium/pipeline";
import { DISTRICT_BY_ID, MEASURE_BY_ID } from "@/lib/data";
import type { ConsiliumEvent, Scenario } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shape and known ids only (validate() silently skips unknown ids); budget, count, conflicts are checked by it.
const bodySchema = z.object({
  teamName: z.string().trim().min(1).max(60).regex(/^[^\n\r]+$/, "one line"),
  scenario: z.object({
    decisions: z.array(
      z.object({
        measureId: z.string().refine((id) => Object.hasOwn(MEASURE_BY_ID, id), "unknown measureId"),
        districtId: z
          .string()
          .refine((id) => Object.hasOwn(DISTRICT_BY_ID, id), "unknown districtId")
          .optional(),
      }),
    ).max(20),
  }),
});

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

// Cost guard: each run makes up to ~9 paid LLM calls, and a dropped client does not stop it.
const MAX_ACTIVE_RUNS = 3;
const MIN_INTERVAL_MS = 5_000;
let activeRuns = 0;
const lastStartByIp = new Map<string, number>();

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "local";
}

export async function POST(request: Request) {
  if (activeRuns >= MAX_ACTIVE_RUNS) {
    return Response.json({ error: `Сейчас идёт ${activeRuns} прогона, попробуйте через минуту` }, { status: 429 });
  }
  const ip = clientIp(request);
  const last = lastStartByIp.get(ip) ?? 0;
  if (Date.now() - last < MIN_INTERVAL_MS) {
    return Response.json({ error: "Слишком часто: подождите несколько секунд перед новым прогоном" }, { status: 429 });
  }
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "invalid body", issues: z.flattenError(parsed.error) }, { status: 400 });
  }
  const { teamName } = parsed.data;
  const scenario = parsed.data.scenario as Scenario;
  lastStartByIp.set(ip, Date.now());
  activeRuns += 1;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const emit = (event: ConsiliumEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          open = false; // client disconnected; the pipeline still finishes and persists the run
        }
      };
      try {
        await runConsilium({ teamName, scenario }, emit);
      } finally {
        activeRuns = Math.max(0, activeRuns - 1);
        if (open) { try { controller.close(); } catch { /* stream already cancelled */ } }
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
