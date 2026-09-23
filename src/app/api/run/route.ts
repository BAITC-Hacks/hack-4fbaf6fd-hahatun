import { z } from "zod";
import { runConsilium } from "@/lib/consilium/pipeline";
import { DISTRICT_BY_ID, MEASURE_BY_ID } from "@/lib/data";
import type { ConsiliumEvent, Scenario } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shape and known ids only (validate() silently skips unknown ids); budget, count, conflicts are checked by it.
const bodySchema = z.object({
  teamName: z.string().trim().min(1).max(60),
  scenario: z.object({
    decisions: z.array(
      z.object({
        measureId: z.string().refine((id) => Object.hasOwn(MEASURE_BY_ID, id), "unknown measureId"),
        districtId: z
          .string()
          .refine((id) => Object.hasOwn(DISTRICT_BY_ID, id), "unknown districtId")
          .optional(),
      }),
    ),
  }),
});

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

export async function POST(request: Request) {
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
        if (open) controller.close();
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
